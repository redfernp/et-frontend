<?php
/** Staging save -> GitHub preview rebuild; token belongs in wp-config.php. */
defined( 'ABSPATH' ) || exit;

function everytip_queue_frontend_rebuild( $post_id, $post ) {
	if ( ! defined( 'EVERYTIP_PREVIEW_DISPATCH_TOKEN' ) || ! EVERYTIP_PREVIEW_DISPATCH_TOKEN ||
		wp_is_post_revision( $post_id ) || ! in_array( $post->post_type, array( 'post', 'page', 'et_offer' ), true ) ) {
		return;
	}
	// Run after ACF saves finish; repeated edits coalesce into one build.
	if ( ! wp_next_scheduled( 'everytip_dispatch_preview_build' ) ) {
		wp_schedule_single_event( time() + 60, 'everytip_dispatch_preview_build' );
	}
}
add_action( 'save_post', 'everytip_queue_frontend_rebuild', 100, 2 );

function everytip_dispatch_preview_build() {
	if ( ! defined( 'EVERYTIP_PREVIEW_DISPATCH_TOKEN' ) || ! EVERYTIP_PREVIEW_DISPATCH_TOKEN ) {
		return;
	}
	$response = wp_remote_post( 'https://api.github.com/repos/redfernp/et-frontend/dispatches', array(
		'timeout' => 20,
		'redirection' => 0,
		'headers' => array( 'Authorization' => 'Bearer ' . EVERYTIP_PREVIEW_DISPATCH_TOKEN,
			'Accept' => 'application/vnd.github+json', 'Content-Type' => 'application/json', 'X-GitHub-Api-Version' => '2022-11-28' ),
		'body' => wp_json_encode( array( 'event_type' => 'everytip-content-saved' ) ),
	) );
	update_option( 'everytip_preview_last_dispatch', array( 'at' => gmdate( 'c' ),
		'status' => is_wp_error( $response ) ? 'transport_error' : wp_remote_retrieve_response_code( $response ) ), false );
}
add_action( 'everytip_dispatch_preview_build', 'everytip_dispatch_preview_build' );
