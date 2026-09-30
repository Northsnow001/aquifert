<?php
/**
 * Plugin Name: Aquifert Export
 * Description: Exports Aquifert One content (Telex, market indicators, hedge tables, freight routes, tools commentary, library collections and files, Order Desk enquiries) for import into the new Aquifert app. Deactivate and delete it once the move is finished.
 * Version: 1.0.0
 * Requires at least: 6.0
 * Requires PHP: 7.4
 * Author: Aquifert
 */

if ( ! defined( 'ABSPATH' ) ) {
	exit;
}

final class Aquifert_Export {
	const FORMAT       = 'aquifert-export';
	const VERSION      = 1;
	const TOKEN_OPTION = 'aquifert_export_token';
	const TOKEN_TTL    = 3 * DAY_IN_SECONDS;
	const PAGE         = 'aquifert-export';

	public static function boot() {
		add_action( 'admin_menu', [ __CLASS__, 'menu' ] );
		add_action( 'admin_post_aquifert_export_download', [ __CLASS__, 'download' ] );
		add_action( 'admin_post_aquifert_export_revoke', [ __CLASS__, 'revoke' ] );
		add_action( 'rest_api_init', [ __CLASS__, 'routes' ] );
		register_deactivation_hook( __FILE__, [ __CLASS__, 'forget_token' ] );
	}

	/* ---------------- Admin page ---------------- */

	public static function menu() {
		add_management_page( 'Aquifert export', 'Aquifert export', 'manage_options', self::PAGE, [ __CLASS__, 'page' ] );
	}

	public static function page() {
		if ( ! current_user_can( 'manage_options' ) ) {
			wp_die( esc_html__( 'You do not have permission to export.' ) );
		}

		$files = self::library_ids();
		$bytes = 0;
		foreach ( $files as $id ) {
			$path = get_attached_file( $id );
			if ( is_string( $path ) && file_exists( $path ) ) {
				$bytes += (int) filesize( $path );
			}
		}
		$token       = get_option( self::TOKEN_OPTION );
		$active      = is_array( $token ) && ! empty( $token['expires'] ) && (int) $token['expires'] > time();
		$collections = wp_count_terms( [ 'taxonomy' => 'vantage_collection', 'hide_empty' => false ] );
		$counts      = [
			'Telex messages'         => self::count_posts( 'telex' ),
			'Hedge tables'           => self::count_posts( 'hedge_table' ),
			'Market indicator saves' => self::count_posts( 'market_indicator' ),
			'Freight route saves'    => self::count_posts( 'freight_opportunity' ),
			'Library collections'    => is_wp_error( $collections ) ? 0 : (int) $collections,
			'Library files'          => count( $files ) . ' (' . size_format( $bytes ) . ')',
			'Order Desk enquiries'   => self::count_posts( 'aq_enquiry' ),
		];
		?>
		<div class="wrap">
			<h1>Aquifert export</h1>
			<p style="max-width:720px">Downloads one file with your Aquifert One content. Upload it in the new app under <strong>Admin → Import from WordPress</strong>. The file also lets the new app fetch the library files from this site for <?php echo esc_html( human_time_diff( 0, self::TOKEN_TTL ) ); ?>, so keep it private.</p>

			<?php if ( isset( $_GET['revoked'] ) ) : ?>
				<div class="notice notice-success"><p>File access revoked. Earlier export files can no longer download library files.</p></div>
			<?php endif; ?>

			<table class="widefat striped" style="max-width:520px;margin:16px 0">
				<tbody>
				<?php foreach ( $counts as $label => $value ) : ?>
					<tr><td><?php echo esc_html( $label ); ?></td><td style="text-align:right"><strong><?php echo esc_html( (string) $value ); ?></strong></td></tr>
				<?php endforeach; ?>
				</tbody>
			</table>

			<form method="post" action="<?php echo esc_url( admin_url( 'admin-post.php' ) ); ?>" style="display:inline-block;margin-right:8px">
				<?php wp_nonce_field( 'aquifert_export_download' ); ?>
				<input type="hidden" name="action" value="aquifert_export_download">
				<button type="submit" class="button button-primary button-hero">Download export file</button>
			</form>

			<?php if ( $active ) : ?>
				<form method="post" action="<?php echo esc_url( admin_url( 'admin-post.php' ) ); ?>" style="display:inline-block">
					<?php wp_nonce_field( 'aquifert_export_revoke' ); ?>
					<input type="hidden" name="action" value="aquifert_export_revoke">
					<button type="submit" class="button button-hero">Revoke file access</button>
				</form>
				<p class="description">File access is open until <?php echo esc_html( wp_date( 'j M Y, H:i', (int) $token['expires'] ) ); ?>. Downloading a new export replaces it.</p>
			<?php endif; ?>
		</div>
		<?php
	}

	private static function count_posts( $type ) {
		$counts = wp_count_posts( $type );
		$total  = 0;
		foreach ( [ 'publish', 'draft', 'pending', 'private', 'future' ] as $status ) {
			$total += isset( $counts->$status ) ? (int) $counts->$status : 0;
		}
		return $total;
	}

	/* ---------------- Export file ---------------- */

	public static function download() {
		if ( ! current_user_can( 'manage_options' ) ) {
			wp_die( esc_html__( 'You do not have permission to export.' ) );
		}
		check_admin_referer( 'aquifert_export_download' );
		if ( function_exists( 'set_time_limit' ) ) {
			@set_time_limit( 300 );
		}

		$token   = wp_generate_password( 48, false, false );
		$expires = time() + self::TOKEN_TTL;
		update_option( self::TOKEN_OPTION, [ 'hash' => hash( 'sha256', $token ), 'expires' => $expires ], false );

		$payload = [
			'format'          => self::FORMAT,
			'version'         => self::VERSION,
			'site'            => home_url(),
			'timezone'        => wp_timezone_string(),
			'exportedAt'      => gmdate( 'c' ),
			'download'        => [
				'endpoint'  => rest_url( 'aquifert-export/v1/file/' ),
				'token'     => $token,
				'expiresAt' => gmdate( 'c', $expires ),
			],
			'telex'           => self::telex(),
			'indicators'      => self::indicators(),
			'hedgeTables'     => self::hedge_tables(),
			'freight'         => self::freight(),
			'toolsCommentary' => (string) get_option( 'aquifert_academy_commentary', '' ),
			'collections'     => self::collections(),
			'products'        => self::products(),
			'library'         => self::library(),
			'enquiries'       => self::enquiries(),
		];

		nocache_headers();
		header( 'Content-Type: application/json; charset=utf-8' );
		header( 'Content-Disposition: attachment; filename="aquifert-export-' . gmdate( 'Ymd-Hi' ) . '.json"' );
		echo wp_json_encode( $payload, JSON_UNESCAPED_SLASHES | JSON_UNESCAPED_UNICODE );
		exit;
	}

	public static function revoke() {
		if ( ! current_user_can( 'manage_options' ) ) {
			wp_die( esc_html__( 'You do not have permission to do that.' ) );
		}
		check_admin_referer( 'aquifert_export_revoke' );
		self::forget_token();
		wp_safe_redirect( admin_url( 'tools.php?page=' . self::PAGE . '&revoked=1' ) );
		exit;
	}

	public static function forget_token() {
		delete_option( self::TOKEN_OPTION );
	}

	private static function posts( $type, $statuses = [ 'publish', 'draft', 'pending', 'private', 'future' ] ) {
		return get_posts(
			[
				'post_type'        => $type,
				'post_status'      => $statuses,
				'posts_per_page'   => -1,
				'orderby'          => 'date',
				'order'            => 'DESC',
				'suppress_filters' => true,
			]
		);
	}

	private static function meta( $post_id, $key ) {
		if ( function_exists( 'get_field' ) ) {
			$value = get_field( $key, $post_id );
			if ( $value !== null && $value !== false && $value !== '' ) {
				return $value;
			}
		}
		return get_post_meta( $post_id, $key, true );
	}

	private static function author_name( WP_Post $post ) {
		$name = get_the_author_meta( 'display_name', (int) $post->post_author );
		return $name ? (string) $name : '';
	}

	private static function base( WP_Post $post ) {
		return [
			'id'       => (int) $post->ID,
			'status'   => (string) $post->post_status,
			'title'    => (string) $post->post_title,
			'date'     => (string) $post->post_date,
			'dateGmt'  => (string) $post->post_date_gmt,
			'modified' => (string) $post->post_modified,
		];
	}

	private static function telex() {
		$out = [];
		foreach ( self::posts( 'telex' ) as $post ) {
			$content = (string) $post->post_content;
			if ( $content === '' ) {
				$content = (string) self::meta( $post->ID, 'description' );
			}
			if ( $content === '' ) {
				$raw = get_post_meta( $post->ID, '_jongo_raw', true ) ?: get_post_meta( $post->ID, '_whatsapp_raw_payload', true );
				if ( $raw ) {
					$data    = json_decode( (string) $raw, true );
					$content = (string) ( $data['messages'][0]['text']['body'] ?? '' );
				}
			}
			$author = function_exists( 'get_field' ) ? (string) get_field( 'author', $post->ID ) : '';
			$tags   = wp_get_post_terms( $post->ID, 'post_tag', [ 'fields' => 'names' ] );
			$out[]  = self::base( $post ) + [
				'content' => $content,
				'author'  => $author !== '' ? $author : self::author_name( $post ),
				'tags'    => is_array( $tags ) ? array_values( array_map( 'strval', $tags ) ) : [],
			];
		}
		return $out;
	}

	private static function indicators() {
		$posts = self::posts( 'market_indicator', [ 'publish' ] );
		if ( empty( $posts ) ) {
			return null;
		}
		$post = $posts[0];
		$out  = self::base( $post );
		foreach ( [ 'nitrogen', 'phosphate', 'potassium' ] as $key ) {
			$value       = self::meta( $post->ID, $key . '_value' );
			$out[ $key ] = [
				'value' => is_numeric( $value ) ? (float) $value : null,
				'note'  => (string) self::meta( $post->ID, $key . '_note' ),
			];
		}
		return $out;
	}

	private static function hedge_tables() {
		$out = [];
		foreach ( self::posts( 'hedge_table' ) as $post ) {
			$raw    = (string) self::meta( $post->ID, 'table_data_json' );
			$parsed = $raw !== '' ? json_decode( $raw, true ) : null;
			$out[]  = self::base( $post ) + [
				'content' => (string) $post->post_content,
				'data'    => is_array( $parsed ) ? $parsed : null,
			];
		}
		return $out;
	}

	private static function freight() {
		$posts = self::posts( 'freight_opportunity', [ 'publish' ] );
		$out   = [
			'narrative' => (string) get_option( 'aquifert_freight_narrative', '' ),
			'routes'    => [],
			'modified'  => '',
		];
		if ( ! empty( $posts ) ) {
			$post = $posts[0];
			$raw  = (string) self::meta( $post->ID, 'table_data_json' );
			if ( $raw === '' ) {
				$raw = (string) get_post_meta( $post->ID, 'freight_data', true );
			}
			$parsed          = $raw !== '' ? json_decode( $raw, true ) : null;
			$out['routes']   = is_array( $parsed ) && isset( $parsed['routes'] ) && is_array( $parsed['routes'] ) ? array_values( $parsed['routes'] ) : [];
			$out['modified'] = (string) $post->post_modified;
		}
		return $out;
	}

	private static function collections() {
		$terms = get_terms( [ 'taxonomy' => 'vantage_collection', 'hide_empty' => false ] );
		if ( is_wp_error( $terms ) || ! is_array( $terms ) ) {
			return [];
		}
		$out = [];
		foreach ( $terms as $term ) {
			$out[] = [
				'id'          => (int) $term->term_id,
				'name'        => (string) $term->name,
				'slug'        => (string) $term->slug,
				'parent'      => (int) $term->parent,
				'description' => (string) $term->description,
				'private'     => (bool) get_term_meta( (int) $term->term_id, '_aquifert_private_collection', true ),
			];
		}
		return $out;
	}

	private static function products() {
		$posts = get_posts(
			[
				'post_type'      => 'memberpressproduct',
				'post_status'    => 'publish',
				'posts_per_page' => -1,
				'orderby'        => 'menu_order title',
				'order'          => 'ASC',
			]
		);
		$out   = [];
		foreach ( $posts as $post ) {
			$out[] = [ 'id' => (int) $post->ID, 'title' => (string) $post->post_title, 'slug' => (string) $post->post_name ];
		}
		return $out;
	}

	private static function library_ids() {
		$ids = get_option( 'aquifert_vantage_media_ids', [] );
		return is_array( $ids ) ? array_values( array_unique( array_filter( array_map( 'absint', $ids ) ) ) ) : [];
	}

	private static function library() {
		$out = [];
		foreach ( self::library_ids() as $id ) {
			$post = get_post( $id );
			if ( ! ( $post instanceof WP_Post ) || $post->post_type !== 'attachment' ) {
				continue;
			}
			$path  = get_attached_file( $id );
			$exists = is_string( $path ) && $path !== '' && file_exists( $path );
			$terms = wp_get_object_terms( $id, 'vantage_collection', [ 'fields' => 'ids' ] );
			$out[] = self::base( $post ) + [
				'filename'    => $exists ? wp_basename( $path ) : wp_basename( (string) get_post_meta( $id, '_wp_attached_file', true ) ),
				'mime'        => (string) $post->post_mime_type,
				'bytes'       => $exists ? (int) filesize( $path ) : 0,
				'missing'     => ! $exists,
				'caption'     => (string) $post->post_excerpt,
				'description' => (string) $post->post_content,
				'collections' => is_array( $terms ) ? array_values( array_map( 'intval', $terms ) ) : [],
				'productId'   => (int) get_post_meta( $id, '_aquifert_vantage_memberpress_product_id', true ),
				'author'      => self::author_name( $post ),
			];
		}
		return $out;
	}

	private static function flatten( $value ) {
		if ( is_array( $value ) ) {
			return implode( ', ', array_map( [ __CLASS__, 'flatten' ], $value ) );
		}
		if ( is_bool( $value ) ) {
			return $value ? 'Yes' : 'No';
		}
		return is_scalar( $value ) ? (string) $value : '';
	}

	private static function enquiries() {
		$out = [];
		foreach ( self::posts( 'aq_enquiry', [ 'publish', 'draft', 'pending', 'private' ] ) as $post ) {
			$payload = get_post_meta( $post->ID, '_aq_enquiry_payload', true );
			$fields  = [];
			if ( is_array( $payload ) ) {
				foreach ( $payload as $key => $value ) {
					$fields[ (string) $key ] = self::flatten( $value );
				}
			}
			$out[] = self::base( $post ) + [
				'content' => (string) $post->post_content,
				'payload' => $fields,
			];
		}
		return $out;
	}

	/* ---------------- Library file downloads ---------------- */

	public static function routes() {
		register_rest_route(
			'aquifert-export/v1',
			'/file/(?P<id>\d+)',
			[
				'methods'             => 'GET',
				'callback'            => [ __CLASS__, 'serve_file' ],
				'permission_callback' => [ __CLASS__, 'token_valid' ],
			]
		);
	}

	public static function token_valid( WP_REST_Request $request ) {
		$stored = get_option( self::TOKEN_OPTION );
		$given  = (string) $request->get_header( 'x-aquifert-export-token' );
		if ( ! is_array( $stored ) || empty( $stored['hash'] ) || (int) ( $stored['expires'] ?? 0 ) < time() || $given === '' ) {
			return new WP_Error( 'aquifert_export_token', 'The export link has expired or was revoked. Download a new export file.', [ 'status' => 401 ] );
		}
		if ( ! hash_equals( (string) $stored['hash'], hash( 'sha256', $given ) ) ) {
			return new WP_Error( 'aquifert_export_token', 'The export token does not match. Download a new export file.', [ 'status' => 401 ] );
		}
		return true;
	}

	public static function serve_file( WP_REST_Request $request ) {
		$id = absint( $request['id'] );
		if ( ! in_array( $id, self::library_ids(), true ) ) {
			return new WP_Error( 'aquifert_export_file', 'That file is not in the library.', [ 'status' => 404 ] );
		}
		$path = get_attached_file( $id );
		if ( ! is_string( $path ) || $path === '' || ! is_readable( $path ) ) {
			return new WP_Error( 'aquifert_export_file', 'The file is missing from the uploads folder.', [ 'status' => 404 ] );
		}
		if ( function_exists( 'set_time_limit' ) ) {
			@set_time_limit( 0 );
		}
		while ( ob_get_level() > 0 ) {
			ob_end_clean();
		}
		nocache_headers();
		header( 'Content-Type: ' . ( get_post_mime_type( $id ) ?: 'application/octet-stream' ) );
		header( 'Content-Length: ' . (string) filesize( $path ) );
		header( 'Content-Disposition: attachment; filename="' . str_replace( '"', '', wp_basename( $path ) ) . '"' );
		readfile( $path );
		exit;
	}
}

Aquifert_Export::boot();
