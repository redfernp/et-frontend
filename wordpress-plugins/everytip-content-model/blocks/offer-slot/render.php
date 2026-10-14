<?php
/**
 * Render a data marker only. The Astro build resolves current, verified copy.
 * This deliberately emits no affiliate URL, offer headline or terms.
 */
defined( 'ABSPATH' ) || exit;

$offer_id = absint( get_field( 'et_slot_offer' ) );
$layout   = get_field( 'et_slot_layout' );
$heading  = trim( (string) get_field( 'et_slot_heading' ) );

if ( ! $offer_id || 'et_offer' !== get_post_type( $offer_id ) ) {
	if ( is_admin() ) {
		echo '<p>Select an EveryTip offer to complete this slot.</p>';
	}
	return;
}

$layout = in_array( $layout, array( 'inline', 'compact' ), true ) ? $layout : 'inline';
printf(
	'<div data-everytip-offer-slot="%d" data-layout="%s" data-heading="%s"></div>',
	$offer_id,
	esc_attr( $layout ),
	esc_attr( $heading )
);
