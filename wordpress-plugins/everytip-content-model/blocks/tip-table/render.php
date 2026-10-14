<?php
/**
 * Reference only: no Ninja Tables shortcode execution and no copied rows.
 * The Astro data layer must resolve the table ID and exact optional filter.
 */
defined( 'ABSPATH' ) || exit;

$table_id = absint( get_field( 'et_tip_table_id' ) );
$filter   = get_field( 'et_tip_table_filter' );
$filter   = false === $filter || null === $filter ? '' : (string) $filter;

if ( ! $table_id || ! in_array( $table_id, everytip_legacy_tip_table_ids(), true ) ||
	strlen( $filter ) > 480 || preg_match( '/[\x00-\x1F\x7F<>]/', $filter ) ||
	wp_check_invalid_utf8( $filter ) !== $filter ) {
	if ( is_admin() ) {
		echo '<p>Choose an approved EveryTip table ID and a valid optional filter.</p>';
	}
	return;
}

$filter_attribute = '' === $filter ? '' : sprintf( ' data-everytip-tip-table-filter="%s"', esc_attr( $filter ) );
printf( '<div data-everytip-tip-table-id="%d"%s></div>', $table_id, $filter_attribute );

if ( is_admin() ) {
	printf( '<p>Tip table #%d%s. Rows are resolved by the Astro preview, not copied into this post.</p>',
		$table_id,
		'' === $filter ? '' : ' — filter: ' . esc_html( $filter )
	);
}
