<?php
/**
 * Plugin Name: EveryTip Content Model
 * Description: Staging-first ACF offer and bookmaker fields with capability-checked editorial endpoints.
 * Version: 0.7.0-dev
 * Requires Plugins: advanced-custom-fields-pro
 * Text Domain: everytip-content-model
 */

defined( 'ABSPATH' ) || exit;
require_once __DIR__ . '/rebuild-hook.php';

/**
 * Additional offer and bookmaker fields. These complement, rather than
 * replace, the three existing pilot field groups. None uses default WP REST.
 */
function everytip_register_offer_fields() {
	if ( ! function_exists( 'acf_add_local_field_group' ) ) {
		return;
	}

	acf_add_local_field_group(
		array(
			'key'                => 'group_everytip_offer_public_v1',
			'title'              => 'EveryTip Offer Publishing',
			'fields'             => array(
				array( 'key' => 'field_et_offer_uid_v1', 'label' => 'Stable offer ID', 'name' => 'et_offer_uid', 'type' => 'text', 'required' => 1, 'instructions' => 'Internal permanent ID; do not change after this offer is used.', 'show_in_graphql' => 1 ),
				array( 'key' => 'field_et_offer_status_v1', 'label' => 'Offer status', 'name' => 'et_offer_status', 'type' => 'select', 'choices' => array( 'draft' => 'Draft', 'active' => 'Active', 'paused' => 'Paused', 'expired' => 'Expired' ), 'default_value' => 'draft', 'required' => 1, 'show_in_graphql' => 1 ),
				array( 'key' => 'field_et_offer_cta_v1', 'label' => 'CTA label', 'name' => 'et_offer_cta_label', 'type' => 'text', 'maxlength' => 80, 'show_in_graphql' => 1 ),
				array( 'key' => 'field_et_offer_highlight_v1', 'label' => 'Offer highlight (optional)', 'name' => 'et_offer_highlight', 'type' => 'text', 'maxlength' => 120, 'instructions' => 'Short promotion-specific hook only. Not a substitute for exact terms or eligibility.', 'show_in_graphql' => 1 ),
				array( 'key' => 'field_et_offer_eligibility_v1', 'label' => 'Customer eligibility', 'name' => 'et_offer_eligibility', 'type' => 'textarea', 'rows' => 3, 'show_in_graphql' => 1 ),
				array( 'key' => 'field_et_offer_countries_in_v1', 'label' => 'Included country codes', 'name' => 'et_offer_countries_include', 'type' => 'text', 'instructions' => 'Comma-separated ISO 3166-1 alpha-2 codes, e.g. GB,IE. Blank means no countries approved; it does not mean worldwide.', 'show_in_graphql' => 1 ),
				array( 'key' => 'field_et_offer_countries_out_v1', 'label' => 'Excluded country codes', 'name' => 'et_offer_countries_exclude', 'type' => 'text', 'instructions' => 'Comma-separated ISO 3166-1 alpha-2 codes.', 'show_in_graphql' => 1 ),
				array( 'key' => 'field_et_offer_starts_v1', 'label' => 'Starts at', 'name' => 'et_offer_starts_at', 'type' => 'date_time_picker', 'display_format' => 'd/m/Y H:i', 'return_format' => 'c', 'instructions' => 'WordPress site time zone; leave blank until verified.', 'show_in_graphql' => 1 ),
				array( 'key' => 'field_et_offer_ends_v1', 'label' => 'Ends at', 'name' => 'et_offer_ends_at', 'type' => 'date_time_picker', 'display_format' => 'd/m/Y H:i', 'return_format' => 'c', 'instructions' => 'WordPress site time zone; do not guess an expiry.', 'show_in_graphql' => 1 ),
				array( 'key' => 'field_et_offer_checked_v1', 'label' => 'Last checked', 'name' => 'et_offer_last_checked', 'type' => 'date_picker', 'display_format' => 'd/m/Y', 'return_format' => 'Y-m-d', 'show_in_graphql' => 1 ),
				array( 'key' => 'field_et_offer_terms_url_v1', 'label' => 'Official full terms URL', 'name' => 'et_offer_full_terms_url', 'type' => 'url', 'instructions' => 'Link directly to the operator offer terms. This is separate from the approved space-restricted terms and affiliate destination; verify before activating an offer.', 'show_in_graphql' => 1 ),
			),
			'location'           => array( array( array( 'param' => 'post_type', 'operator' => '==', 'value' => 'et_offer' ) ) ),
			'active'             => true,
			'show_in_rest'       => 0,
			'show_in_graphql'    => true,
			'graphql_field_name' => 'EveryTipOfferPublishing',
		)
	);

	acf_add_local_field_group(
		array(
			'key'                => 'group_everytip_bookmaker_editorial_v1',
			'title'              => 'EveryTip Bookmaker Editorial',
			'fields'             => array(
				array(
					'key'             => 'field_et_bookmaker_usps_v1',
					'label'           => 'Bookmaker USPs (optional)',
					'name'            => 'et_bookmaker_usps',
					'type'            => 'repeater',
					'min'             => 0,
					'max'             => 3,
					'layout'          => 'table',
					'instructions'    => 'Evergreen editorial strengths only. Recheck claims when the bookmaker changes; leave empty to hide.',
					'show_in_graphql' => 1,
					'sub_fields'      => array(
						array( 'key' => 'field_et_bookmaker_usp_text_v1', 'label' => 'USP text', 'name' => 'text', 'type' => 'text', 'required' => 1, 'maxlength' => 120, 'show_in_graphql' => 1 ),
					),
				),
			),
			'location'           => array( array( array( 'param' => 'post_type', 'operator' => '==', 'value' => 'et_bookmaker' ) ) ),
			'active'             => true,
			'show_in_rest'       => 0,
			'show_in_graphql'    => true,
			'graphql_field_name' => 'EveryTipBookmakerEditorial',
		)
	);

	acf_add_local_field_group(
		array(
			'key'             => 'group_everytip_offer_private_v1',
			'title'           => 'EveryTip Offer Verification (Private)',
			'fields'          => array(
				array( 'key' => 'field_et_offer_source_v1', 'label' => 'Offer source URL', 'name' => 'et_offer_source_url', 'type' => 'url' ),
				array( 'key' => 'field_et_offer_checked_by_v1', 'label' => 'Checked by', 'name' => 'et_offer_checked_by', 'type' => 'user', 'role' => array( 'administrator', 'editor' ), 'return_format' => 'id' ),
				array( 'key' => 'field_et_offer_notes_v1', 'label' => 'Compliance notes', 'name' => 'et_offer_compliance_notes', 'type' => 'textarea', 'rows' => 4 ),
			),
			'location'        => array( array( array( 'param' => 'post_type', 'operator' => '==', 'value' => 'et_offer' ) ) ),
			'active'          => true,
			'show_in_rest'    => 0,
			'show_in_graphql' => false,
		)
	);
}
add_action( 'acf/init', 'everytip_register_offer_fields' );

/**
 * A Gutenberg placement block holds a reference, not duplicated offer copy.
 * Astro will resolve the approved offer and terms through its typed data layer.
 */
function everytip_register_offer_slot_block() {
	if ( ! function_exists( 'acf_add_local_field_group' ) ) {
		return;
	}
	register_block_type( __DIR__ . '/blocks/offer-slot' );
	acf_add_local_field_group(
		array(
			'key'    => 'group_everytip_offer_slot_v1',
			'title'  => 'EveryTip Offer Slot',
			'fields' => array(
				array( 'key' => 'field_et_slot_offer_v1', 'label' => 'Offer', 'name' => 'et_slot_offer', 'type' => 'post_object', 'post_type' => array( 'et_offer' ), 'return_format' => 'id', 'required' => 1, 'instructions' => 'Choose the central offer record. Headline, destination and terms are never copied into this block.' ),
				array( 'key' => 'field_et_slot_layout_v1', 'label' => 'Layout', 'name' => 'et_slot_layout', 'type' => 'select', 'choices' => array( 'inline' => 'Inline card', 'compact' => 'Compact card' ), 'default_value' => 'inline', 'required' => 1 ),
				array( 'key' => 'field_et_slot_heading_v1', 'label' => 'Context heading (optional)', 'name' => 'et_slot_heading', 'type' => 'text', 'maxlength' => 100 ),
			),
			'location' => array( array( array( 'param' => 'block', 'operator' => '==', 'value' => 'acf/everytip-offer-slot' ) ) ),
			'active' => true,
			'show_in_rest' => 0,
			'show_in_graphql' => false,
		)
	);
}
add_action( 'acf/init', 'everytip_register_offer_slot_block' );

/**
 * Audited legacy Ninja IDs are placement references, not an editable row store.
 * If the packaged registry is absent or malformed, the block fails closed.
 */
function everytip_legacy_tip_table_ids() {
	static $ids = null;
	if ( null !== $ids ) {
		return $ids;
	}
	$ids  = array();
	$path = __DIR__ . '/blocks/tip-table/legacy-table-ids.json';
	if ( ! is_readable( $path ) ) {
		return $ids;
	}
	$registry = json_decode( file_get_contents( $path ), true );
	if ( ! is_array( $registry ) || ! isset( $registry['ids'] ) || ! is_array( $registry['ids'] ) ) {
		return $ids;
	}
	foreach ( $registry['ids'] as $id ) {
		if ( is_int( $id ) && $id > 0 ) {
			$ids[] = $id;
		}
	}
	return array_values( array_unique( $ids ) );
}

/**
 * Gutenberg/ACF placement for a separately sourced tips table. The raw
 * filter is intentionally not trimmed: Ninja has a historical trailing-space
 * filter whose exact behaviour must be checked during parity testing.
 */
function everytip_register_tip_table_block() {
	if ( ! function_exists( 'acf_add_local_field_group' ) ) {
		return;
	}
	register_block_type( __DIR__ . '/blocks/tip-table' );
	$choices = array();
	foreach ( everytip_legacy_tip_table_ids() as $id ) {
		$choices[ (string) $id ] = sprintf( 'Ninja table #%d', $id );
	}
	acf_add_local_field_group(
		array(
			'key'    => 'group_everytip_tip_table_v1',
			'title'  => 'EveryTip Tip Table Reference',
			'fields' => array(
				array(
					'key'          => 'field_et_tip_table_id_v1',
					'label'        => 'Existing table ID',
					'name'         => 'et_tip_table_id',
					'type'         => 'select',
					'choices'      => $choices,
					'required'     => 1,
					'ui'           => 1,
					'instructions' => 'Select the audited table reference. Rows are not stored in this block.',
				),
				array(
					'key'          => 'field_et_tip_table_filter_v1',
					'label'        => 'Ninja filter (optional)',
					'name'         => 'et_tip_table_filter',
					'type'         => 'text',
					'maxlength'    => 120,
					'instructions' => 'Preserve the exact legacy filter, including whitespace, until filter parity is verified.',
				),
			),
			'location'        => array( array( array( 'param' => 'block', 'operator' => '==', 'value' => 'acf/everytip-tip-table' ) ) ),
			'active'          => true,
			'show_in_rest'    => 0,
			'show_in_graphql' => false,
		)
	);
}
add_action( 'acf/init', 'everytip_register_tip_table_block' );

/**
 * The first REST slice is read-only. A write route must have optimistic
 * concurrency, field validation, revisions and read-back before activation.
 */
function everytip_offer_api_permission( $request ) {
	$url_params = $request->get_url_params();
	$id = absint( isset( $url_params['id'] ) ? $url_params['id'] : 0 );
	if ( 'et_offer' !== get_post_type( $id ) ) {
		return new WP_Error( 'everytip_offer_not_found', 'Offer not found.', array( 'status' => 404 ) );
	}
	if ( ! current_user_can( 'edit_post', $id ) ) {
		return new WP_Error( 'everytip_offer_forbidden', 'Insufficient editorial permission.', array( 'status' => 403 ) );
	}
	return true;
}

function everytip_offer_api_state( $id ) {
	$id = absint( $id );
	$post = get_post( $id );
	if ( ! $post || ! function_exists( 'get_field' ) ) {
		return new WP_Error( 'everytip_offer_unavailable', 'Offer fields unavailable.', array( 'status' => 503 ) );
	}

	$fields = array();
	foreach ( array( 'et_offer_uid', 'et_offer_status', 'et_offer_cta_label', 'et_offer_highlight', 'et_offer_eligibility', 'et_offer_countries_include', 'et_offer_countries_exclude', 'et_offer_starts_at', 'et_offer_ends_at', 'et_offer_last_checked', 'et_offer_full_terms_url', 'public_headline', 'compact_terms', 'full_terms' ) as $name ) {
		$fields[ $name ] = get_field( $name, $id );
	}

	$state = array(
			'id'           => $id,
			'title'        => get_the_title( $id ),
			'status'       => $post->post_status,
			'modified_gmt' => $post->post_modified_gmt,
			'fields'       => $fields,
		);
	$state['revision_token'] = hash( 'sha256', wp_json_encode( $state ) );
	return $state;
}

function everytip_offer_api_read( $request ) {
	$url_params = $request->get_url_params();
	$state = everytip_offer_api_state( absint( isset( $url_params['id'] ) ? $url_params['id'] : 0 ) );
	return is_wp_error( $state ) ? $state : rest_ensure_response( $state );
}

function everytip_offer_uid_duplicate( $uid, $id ) {
	global $wpdb;
	$other_id = $wpdb->get_var( $wpdb->prepare(
		"SELECT p.ID FROM {$wpdb->posts} AS p INNER JOIN {$wpdb->postmeta} AS m ON m.post_id = p.ID WHERE p.post_type = %s AND p.ID <> %d AND m.meta_key = %s AND LOWER(TRIM(m.meta_value)) = %s LIMIT 1",
		'et_offer', $id, 'et_offer_uid', $uid
	) );
	if ( '' !== $wpdb->last_error ) {
		return new WP_Error( 'everytip_offer_uid_inventory', 'Offer UID inventory unavailable.', array( 'status' => 503 ) );
	}
	return null !== $other_id;
}

/**
 * Assign a missing permanent UID to a draft offer. This route cannot edit
 * headline, terms, eligibility, destination, publication status or CTA.
 */
function everytip_offer_api_write_uid( $request ) {
	$url_params = $request->get_url_params();
	$id   = absint( isset( $url_params['id'] ) ? $url_params['id'] : 0 );
	$body = $request->get_json_params();
	if ( ! is_array( $body ) || 2 !== count( $body ) || ! array_key_exists( 'expected_revision', $body ) || ! array_key_exists( 'uid', $body ) ||
		! is_string( $body['expected_revision'] ) || ! preg_match( '/^[a-f0-9]{64}$/D', $body['expected_revision'] ) ||
		! is_string( $body['uid'] ) || strlen( $body['uid'] ) > 80 ||
		! preg_match( '/^[a-z][a-z0-9]*(?:-[a-z0-9]+)*$/D', $body['uid'] ) ) {
		return new WP_Error( 'everytip_offer_uid_bad_request', 'Expected a revision token and a lowercase permanent offer UID.', array( 'status' => 400 ) );
	}
	if ( ! function_exists( 'update_field' ) ) {
		return new WP_Error( 'everytip_offer_uid_unavailable', 'ACF update unavailable.', array( 'status' => 503 ) );
	}
	// A per-offer unique option serialises attempts to assign different UIDs
	// to the same blank record. The UID claim below serialises the reverse case.
	$edit_lock = '_everytip_offer_uid_edit_lock_' . $id;
	if ( ! add_option( $edit_lock, get_current_user_id(), '', false ) ) {
		return new WP_Error( 'everytip_offer_uid_busy', 'Offer UID is being edited; read again shortly.', array( 'status' => 409 ) );
	}
	try {
		return everytip_offer_api_assign_uid( $id, $body );
	} finally {
		delete_option( $edit_lock );
	}
}

function everytip_offer_api_assign_uid( $id, $body ) {
	$before = everytip_offer_api_state( $id );
	if ( is_wp_error( $before ) ) {
		return $before;
	}
	if ( ! hash_equals( $before['revision_token'], $body['expected_revision'] ) ) {
		return new WP_Error( 'everytip_offer_uid_conflict', 'Offer changed. Read it again before editing.', array( 'status' => 409 ) );
	}
	if ( 'draft' !== $before['status'] || 'draft' !== (string) $before['fields']['et_offer_status'] ) {
		return new WP_Error( 'everytip_offer_uid_not_draft', 'Only inactive draft offers can receive a UID.', array( 'status' => 409 ) );
	}
	$current_uid = trim( (string) $before['fields']['et_offer_uid'] );
	if ( $current_uid === $body['uid'] ) {
		return rest_ensure_response( $before );
	}
	if ( '' !== $current_uid ) {
		return new WP_Error( 'everytip_offer_uid_immutable', 'An existing offer UID cannot be changed through this route.', array( 'status' => 409 ) );
	}
	$duplicate = everytip_offer_uid_duplicate( $body['uid'], $id );
	if ( is_wp_error( $duplicate ) ) {
		return $duplicate;
	}
	if ( $duplicate ) {
		return new WP_Error( 'everytip_offer_uid_duplicate', 'Offer UID is already assigned.', array( 'status' => 409 ) );
	}
	// add_option has a unique database key, serialising concurrent claims for
	// the same UID. A successful claim is retained to prevent later reuse.
	$claim = '_everytip_offer_uid_claim_' . hash( 'sha256', $body['uid'] );
	if ( ! add_option( $claim, $id, '', false ) ) {
		return new WP_Error( 'everytip_offer_uid_claimed', 'Offer UID is reserved or already in use.', array( 'status' => 409 ) );
	}
	$duplicate = everytip_offer_uid_duplicate( $body['uid'], $id );
	if ( is_wp_error( $duplicate ) || $duplicate ) {
		delete_option( $claim );
		return is_wp_error( $duplicate ) ? $duplicate :
			new WP_Error( 'everytip_offer_uid_duplicate', 'Offer UID is already assigned.', array( 'status' => 409 ) );
	}
	$latest = everytip_offer_api_state( $id );
	if ( is_wp_error( $latest ) || ! hash_equals( $before['revision_token'], $latest['revision_token'] ) ||
		! update_field( 'field_et_offer_uid_v1', $body['uid'], $id ) ) {
		delete_option( $claim );
		return new WP_Error( 'everytip_offer_uid_write_conflict', 'Offer changed or UID write failed; read again.', array( 'status' => 409 ) );
	}
	$after = everytip_offer_api_state( $id );
	if ( is_wp_error( $after ) || (string) $after['fields']['et_offer_uid'] !== $body['uid'] ) {
		// Keep the claim: a write with uncertain outcome must fail closed.
		return new WP_Error( 'everytip_offer_uid_readback', 'UID readback failed; manual review required.', array( 'status' => 503 ) );
	}
	add_post_meta( $id, '_everytip_offer_uid_edit_log', array(
		'at_gmt'  => current_time( 'mysql', true ),
		'user_id' => get_current_user_id(),
		'uid'     => $body['uid'],
	) );
	return rest_ensure_response( $after );
}

function everytip_register_offer_api() {
	register_rest_route(
		'everytip/v1',
		'/offer/(?P<id>\d+)',
		array(
			'methods'             => WP_REST_Server::READABLE,
			'callback'            => 'everytip_offer_api_read',
			'permission_callback' => 'everytip_offer_api_permission',
			'args'                => array( 'id' => array( 'required' => true, 'type' => 'integer', 'minimum' => 1 ) ),
		)
	);
	register_rest_route(
		'everytip/v1',
		'/offer/(?P<id>\d+)/uid',
		array(
			'methods'             => 'PATCH',
			'callback'            => 'everytip_offer_api_write_uid',
			'permission_callback' => 'everytip_offer_api_permission',
			'args'                => array( 'id' => array( 'required' => true, 'type' => 'integer', 'minimum' => 1 ) ),
		)
	);
}
add_action( 'rest_api_init', 'everytip_register_offer_api' );

/**
 * Yoast's native Abilities API covers canonical/robots but not the everyday
 * snippet title and description. Keep this small editorial endpoint limited to
 * those fields; never expose advanced SEO flags to an Editor via this route.
 */
function everytip_editorial_seo_permission( $request ) {
	$url_params = $request->get_url_params();
	$id = absint( isset( $url_params['id'] ) ? $url_params['id'] : 0 );
	if ( ! in_array( get_post_type( $id ), array( 'post', 'page' ), true ) ) {
		return new WP_Error( 'everytip_seo_not_found', 'Post or page not found.', array( 'status' => 404 ) );
	}
	if ( ! current_user_can( 'edit_post', $id ) ) {
		return new WP_Error( 'everytip_seo_forbidden', 'Insufficient editorial permission.', array( 'status' => 403 ) );
	}
	return true;
}

function everytip_editorial_seo_state( $id ) {
	$post = get_post( $id );
	$fields = array(
		'seo_title'        => (string) get_post_meta( $id, '_yoast_wpseo_title', true ),
		'meta_description' => (string) get_post_meta( $id, '_yoast_wpseo_metadesc', true ),
		'focus_keyphrase'  => (string) get_post_meta( $id, '_yoast_wpseo_focuskw', true ),
	);
	return array(
		'id'             => $id,
		'post_type'      => $post->post_type,
		'status'         => $post->post_status,
		'modified_gmt'   => $post->post_modified_gmt,
		'fields'         => $fields,
		'revision_token' => hash( 'sha256', wp_json_encode( array( $post->post_modified_gmt, $fields ) ) ),
	);
}

function everytip_editorial_seo_read( $request ) {
	$url_params = $request->get_url_params();
	return rest_ensure_response( everytip_editorial_seo_state( absint( isset( $url_params['id'] ) ? $url_params['id'] : 0 ) ) );
}

function everytip_editorial_seo_write( $request ) {
	$url_params = $request->get_url_params();
	$id = absint( isset( $url_params['id'] ) ? $url_params['id'] : 0 );
	$body = $request->get_json_params();
	if ( ! is_array( $body ) || ! isset( $body['expected_revision'] ) || ! is_string( $body['expected_revision'] ) ||
		! isset( $body['fields'] ) || ! is_array( $body['fields'] ) ) {
		return new WP_Error( 'everytip_seo_bad_request', 'Expected revision token and fields object.', array( 'status' => 400 ) );
	}
	$allowed = array(
		'seo_title'        => array( '_yoast_wpseo_title', 200 ),
		'meta_description' => array( '_yoast_wpseo_metadesc', 320 ),
		'focus_keyphrase'  => array( '_yoast_wpseo_focuskw', 120 ),
	);
	if ( empty( $body['fields'] ) || array_diff( array_keys( $body['fields'] ), array_keys( $allowed ) ) ) {
		return new WP_Error( 'everytip_seo_bad_fields', 'Only title, description and focus keyphrase are writable.', array( 'status' => 400 ) );
	}
	$current = everytip_editorial_seo_state( $id );
	if ( ! hash_equals( $current['revision_token'], $body['expected_revision'] ) ) {
		return new WP_Error( 'everytip_seo_conflict', 'SEO fields or post changed. Read again before editing.', array( 'status' => 409 ) );
	}
	$updates = array();
	foreach ( $body['fields'] as $name => $value ) {
		if ( ! is_string( $value ) || strlen( $value ) > $allowed[ $name ][1] * 4 ) {
			return new WP_Error( 'everytip_seo_invalid_value', 'SEO value must be a short string.', array( 'status' => 400 ) );
		}
		$clean = sanitize_text_field( $value );
		$length = function_exists( 'mb_strlen' ) ? mb_strlen( $clean ) : strlen( $clean );
		if ( $length > $allowed[ $name ][1] ) {
			return new WP_Error( 'everytip_seo_invalid_length', 'SEO value is too long.', array( 'status' => 400 ) );
		}
		$updates[ $allowed[ $name ][0] ] = $clean;
	}
	foreach ( $updates as $meta_key => $value ) {
		update_post_meta( $id, $meta_key, $value );
	}
	$after = everytip_editorial_seo_state( $id );
	add_post_meta( $id, '_everytip_seo_edit_log', array(
		'at_gmt'  => current_time( 'mysql', true ),
		'user_id' => get_current_user_id(),
		'before'  => $current['fields'],
		'after'   => $after['fields'],
	) );
	return rest_ensure_response( $after );
}

function everytip_register_editorial_seo_api() {
	register_rest_route(
		'everytip/v1',
		'/editorial-seo/(?P<id>\d+)',
		array(
			array(
				'methods'             => WP_REST_Server::READABLE,
				'callback'            => 'everytip_editorial_seo_read',
				'permission_callback' => 'everytip_editorial_seo_permission',
			),
			array(
				'methods'             => WP_REST_Server::CREATABLE,
				'callback'            => 'everytip_editorial_seo_write',
				'permission_callback' => 'everytip_editorial_seo_permission',
			),
		)
	);
}
add_action( 'rest_api_init', 'everytip_register_editorial_seo_api' );
