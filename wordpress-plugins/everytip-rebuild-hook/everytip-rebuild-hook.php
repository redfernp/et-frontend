<?php
/**
 * Plugin Name: EveryTip Rebuild Hook
 * Description: Rebuilds the Astro front end on GitHub when published content or Ninja Tables rows change.
 * Version: 1.0.0
 * Requires PHP: 7.4
 *
 * Content change -> GitHub rebuild of the Astro front end.
 * Token: define( 'EVERYTIP_PREVIEW_DISPATCH_TOKEN', '...' ); in wp-config.php.
 *
 * Two triggers, both debounced into one dispatch about a minute after the last change:
 *  - saving a published post, page or offer (or unpublishing one);
 *  - Ninja Tables row edits, which never touch the article itself. A two-minute cron compares
 *    the tables' latest updated_at and row count with the last value it saw.
 */
defined( 'ABSPATH' ) || exit;
// An older content-model plugin may ship the first version of this hook; never declare it twice.
if ( function_exists( 'everytip_queue_frontend_rebuild' ) ) {
	return;
}

function everytip_rebuild_enabled() {
	return defined( 'EVERYTIP_PREVIEW_DISPATCH_TOKEN' ) && EVERYTIP_PREVIEW_DISPATCH_TOKEN;
}

function everytip_queue_frontend_rebuild() {
	if ( everytip_rebuild_enabled() && ! wp_next_scheduled( 'everytip_dispatch_preview_build' ) ) {
		wp_schedule_single_event( time() + 60, 'everytip_dispatch_preview_build' );
	}
}

// Only changes the public site can show: published now, or published before this save.
function everytip_rebuild_on_status( $new_status, $old_status, $post ) {
	if ( wp_is_post_revision( $post ) || wp_is_post_autosave( $post ) ||
		! in_array( $post->post_type, array( 'post', 'page', 'et_offer', 'ninja-table' ), true ) ) {
		return;
	}
	if ( 'publish' === $new_status || 'publish' === $old_status ) {
		everytip_queue_frontend_rebuild();
	}
}
add_action( 'transition_post_status', 'everytip_rebuild_on_status', 100, 3 );

// Ninja Tables row actions, where the installed version fires them.
foreach ( array( 'ninja_table_after_add_item', 'ninja_table_after_update_item', 'ninja_table_after_delete_items',
	'ninja_table_after_items_deleted', 'ninja_tables_after_table_import' ) as $everytip_hook ) {
	add_action( $everytip_hook, 'everytip_queue_frontend_rebuild' );
}

// Fallback for every other way rows change (imports, bulk edits, other plugins).
add_filter( 'cron_schedules', function ( $schedules ) {
	$schedules['everytip_two_minutes'] = array( 'interval' => 120, 'display' => 'Every two minutes (EveryTip)' );
	return $schedules;
} );
add_action( 'init', function () {
	if ( everytip_rebuild_enabled() && ! wp_next_scheduled( 'everytip_check_tip_tables' ) ) {
		wp_schedule_event( time() + 120, 'everytip_two_minutes', 'everytip_check_tip_tables' );
	}
} );
function everytip_check_tip_tables() {
	global $wpdb;
	$table = $wpdb->prefix . 'ninja_table_items';
	if ( $wpdb->get_var( $wpdb->prepare( 'SHOW TABLES LIKE %s', $table ) ) !== $table ) {
		return;
	}
	$row         = $wpdb->get_row( "SELECT MAX(updated_at) AS changed, COUNT(*) AS total FROM {$table}" );
	$fingerprint = $row ? $row->changed . '|' . $row->total : '';
	if ( get_option( 'everytip_tip_tables_fingerprint' ) !== $fingerprint ) {
		update_option( 'everytip_tip_tables_fingerprint', $fingerprint, false );
		everytip_queue_frontend_rebuild();
	}
}
add_action( 'everytip_check_tip_tables', 'everytip_check_tip_tables' );

function everytip_dispatch_preview_build() {
	if ( ! everytip_rebuild_enabled() ) {
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
