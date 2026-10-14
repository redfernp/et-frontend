import { createHash } from 'node:crypto';
import { mkdir, readFile, writeFile, rename } from 'node:fs/promises';
import { parseDocument } from 'htmlparser2';
// Archive membership comes from the same resumable staging GraphQL client.
export async function archiveMembership(query) {
  const members = [];
  let after = null;
  const seen = new Set();
  do {
    const { posts } = await query(`query LaunchMembership($after:String) {
      posts(first:5,after:$after) { nodes { databaseId
        categories(first:100){nodes{databaseId} pageInfo{hasNextPage}}
        tags(first:100){nodes{databaseId} pageInfo{hasNextPage}}
        author{node{databaseId}}
      } pageInfo{hasNextPage endCursor} }
    }`, { after });
    if (!Array.isArray(posts?.nodes)) throw new Error('Missing archive membership');
    for (const post of posts.nodes) {
      if (post.categories.pageInfo.hasNextPage || post.tags.pageInfo.hasNextPage) throw new Error(`Term membership truncated: ${post.databaseId}`);
      members.push(post);
    }
    console.log(`Archive membership: ${members.length}`);
    if (!posts.pageInfo.hasNextPage) break;
    after = posts.pageInfo.endCursor;
    if (!after || seen.has(after) || !posts.nodes.length) throw new Error('Archive membership cursor stalled');
    seen.add(after);
  } while (true);
  return members;
}

export function paginateArchive(posts, pageSize) {
  if (!Number.isSafeInteger(pageSize) || pageSize < 1) throw new Error('Invalid WordPress archive page size');
  return Array.from({length: Math.ceil(posts.length / pageSize)}, (_, index) => posts.slice(index * pageSize, (index + 1) * pageSize));
}

const elements = (node, name) => [...(node.name === name ? [node] : []), ...(node.children ?? []).flatMap(child => elements(child, name))];
const text = node => node?.type === 'text' ? node.data : (node?.children ?? []).map(text).join('');
export function archiveSeo(html) {
  const doc = parseDocument(html);
  const meta = Object.fromEntries(elements(doc, 'meta').map(n => [n.attribs.name, n.attribs.content]));
  const robots = (meta.robots || '').split(/[,\s]+/);
  const title = text(elements(doc, 'title')[0]);
  if (!title) throw new Error('Archive HTML has no title');
  return { title, metaDesc: meta.description || '', canonical: elements(doc, 'link').find(n => n.attribs.rel === 'canonical')?.attribs.href || '',
    metaRobotsNoindex: robots.includes('noindex') ? 'noindex' : 'index', metaRobotsNofollow: robots.includes('nofollow') ? 'nofollow' : 'follow' };
}

// WPGraphQL returns the base term SEO even for /page/2. Read rendered archive
// metadata so paginated titles and canonicals are never guessed.
async function renderedSeo(url, fresh, receipts) {
  const key = createHash('sha256').update(url).digest('hex');
  const file = `outputs/archive-cache/${key}.json`;
  if (!fresh) {
    try { const cached = JSON.parse(await readFile(file, 'utf8')); if (cached.url !== url) throw new Error('Archive cache identity mismatch'); receipts.push({key,cached:true,fetchedAt:cached.fetchedAt}); return cached.result || {seo:cached.seo}; }
    catch (error) { if (error.code !== 'ENOENT') throw error; }
  }
  for (let attempt = 0; attempt < 6; attempt++) {
    try {
      const response = await fetch(url, {redirect:'manual',signal:AbortSignal.timeout(60000)});
      let result;
      if ([301,302,307,308].includes(response.status) && response.headers.get('location')) {
        const target = new URL(response.headers.get('location'),url);
        result = {redirect:{status:response.status,location:target.origin===new URL(url).origin ? target.pathname+target.search+target.hash : target.href}};
        await response.body?.cancel();
      } else if (response.status === 404) {
        result = {missing:true}; await response.body?.cancel();
      } else {
        if (!response.ok) { const e = new Error(`Archive ${url}: HTTP ${response.status}`); e.permanent=response.status < 500 && ![408,429].includes(response.status); throw e; }
        result = {seo:archiveSeo(await response.text())};
      }
      const fetchedAt = new Date().toISOString();
      await mkdir('outputs/archive-cache',{recursive:true});
      await writeFile(`${file}.tmp`,JSON.stringify({url,result,fetchedAt})); await rename(`${file}.tmp`,file);
      receipts.push({key,cached:false,fetchedAt}); return result;
    } catch(error) { if(error.permanent || attempt===5) throw error; console.warn(`Archive attempt ${attempt+1}/6: ${error.message}`); await new Promise(r=>setTimeout(r,Math.min(20000,2000*2**attempt))); }
  }
}

export async function launchArchives(records, {query, endpoint, fresh=false, receipts=[]}) {
  const {allSettings:settings} = await query('{allSettings{readingSettingsPageForPosts readingSettingsPostsPerPage}}');
  const members = await archiveMembership(query);
  const byId = new Map(members.map(p=>[p.databaseId,p]));
  const posts = records.filter(r=>r.kind==='posts').map(({databaseId,uri,title,date})=>({databaseId,uri,title,date}));
  if (posts.some(p=>!byId.has(p.databaseId)) || posts.length!==members.length) throw new Error('Archive membership differs from post inventory');
  const archives=[];
  for (const kind of ['categories','tags','users']) {
    let after=null; const cursors=new Set();
    do {
      const data=await query(`query LaunchArchives($after:String){${kind}(first:5,after:$after${kind==='users'?'':',where:{hideEmpty:true}'}){nodes{databaseId name uri}pageInfo{endCursor hasNextPage}}}`,{after});
      const connection=data[kind];
      for(const node of connection.nodes) {
        const selected=posts.filter(post=>{
          const m=byId.get(post.databaseId);
          return kind==='users' ? m.author?.node?.databaseId===node.databaseId : m[kind].nodes.some(t=>t.databaseId===node.databaseId);
        });
        if(selected.length) archives.push({...node,posts:selected});
      }
      if(!connection.pageInfo.hasNextPage) break;
      after=connection.pageInfo.endCursor;
      if(!after || cursors.has(after) || !connection.nodes.length) throw new Error(`Archive discovery stalled: ${kind}`);
      cursors.add(after);
    } while(true);
  }
  if(settings.readingSettingsPageForPosts) {
    const {page}=await query('query LaunchBlog($id:ID!){page(id:$id,idType:DATABASE_ID){databaseId slug title uri status}}',{id:settings.readingSettingsPageForPosts});
    if(page?.status!=='publish') throw new Error('Assigned posts page is not published');
    archives.push({...page,name:page.title,uri:page.uri||`/${page.slug}`,posts});
  }
  const routes=[]; const redirects={}; const existing=new Set(records.map(r=>r.uri));
  for(const archive of archives) {
    const pages=paginateArchive(archive.posts,settings.readingSettingsPostsPerPage);
    const base=archive.uri.replace(/\/$/,'');
    for(let index=0;index<pages.length;index++) {
      const uri=index?`${base}/page/${index+1}`:base;
      if(existing.has(uri)) throw new Error(`Archive collides with content: ${uri}`);
      existing.add(uri);
      const result=await renderedSeo(new URL(uri,endpoint).href,fresh,receipts);
      if(result.redirect){
        redirects[uri]=result.redirect;console.log(`Archive redirect: ${uri} -> ${result.redirect.location}`);
        // Builder landing pages often replace taxonomy archives. GraphQL keeps
        // their prose but omits the builder's query loop. Recreate that family
        // from the same category membership, never from article-specific code.
        const landing = index===0 && records.find(r=>r.kind==='pages' && r.uri===result.redirect.location);
        if(landing){
          landing.posts=pages[0];landing.page=1;landing.pageCount=pages.length;landing.archiveBase=landing.uri;
          for(let page=2;page<=pages.length;page++){
            const path=`${landing.uri}/page/${page}`;
            const target=await renderedSeo(new URL(path,endpoint).href,fresh,receipts);
            if(target.redirect){redirects[path]=target.redirect;continue;}
            if(target.missing)continue;
            if(existing.has(path))throw new Error(`Landing archive collision: ${path}`);
            existing.add(path);
            routes.push({...landing,uri:path,kind:'archive',seo:target.seo,posts:pages[page-1],page});
            console.log(`Archive landing page: ${path}`);
          }
        }
        continue;
      }
      if(result.missing)throw new Error(`Published archive not found: ${uri}`);
      routes.push({uri,title:archive.name,kind:'archive',seo:result.seo,posts:pages[index],page:index+1,pageCount:pages.length,archiveBase:base});
      console.log(`Archive route: ${uri}`);
    }
  }
  await mkdir('outputs',{recursive:true});
  await writeFile('outputs/archive-redirects.json',JSON.stringify(redirects,null,2));
  return {records:routes,redirects};
}
