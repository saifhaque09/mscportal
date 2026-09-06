**Repository Summary**
- **Type:** Laravel API backend (Laravel 12, PHP ^8.2).
- **Primary layout:** `app/Modules/*` (feature modules), `routes/*` (global routes), `database/*` (migrations/seeders), and `app/Http/Controllers/BaseController.php` for shared API responses.

**How Modules Work (Big Picture)**
- **Module location:** Feature code lives under `app/Modules/<ModuleName>/` with `Controllers/`, `Models/`, and `Config/`.
- **Module config exposure:** `App\Providers\AppServiceProvider` loads module `Config/*.php` into runtime config (e.g. `config('users')`, `config('settings')`). See `app/Providers/AppServiceProvider.php`.
- **Module routes:** Module route files are explicitly registered in `bootstrap/app.php` using `Route::group(...)` with prefixes (examples: `users`, `auth`, `settings`). Look there to see which module routes are active.
- **Standard controller responses:** Controllers extend `App\Http\Controllers\BaseController` and use `sendResponse()` / `sendError()` to return JSON with `{ success, message, payload }`.

**Developer Workflows & Commands**
- **Install PHP deps:** `composer install` (project expects PHP >= 8.2).
- **Environment bootstrapping:** copy `.env.example` → `.env` (composer scripts often do this automatically). Run `php artisan key:generate` if not already done.
- **Local dev (all services):** `composer run-script dev` runs a concurrently-based dev stack (includes `php artisan serve`, `php artisan queue:listen`, `php artisan pail`, and `npm run dev`). See `composer.json` -> `scripts.dev`.
- **Frontend build / watch:** `npm install` then `npm run dev` (Vite) or `npm run build` for production assets.
- **Migrations:** `php artisan migrate` (note composer `post-create-project-cmd` may create `database/database.sqlite` and run migrations automatically).
- **Tests:** This repo uses Pest. Run `./vendor/bin/pest` or `php artisan test`. Unit/Feature suites defined in `phpunit.xml` (testing uses in-memory sqlite by default).
- **Formatting & lint:** `./vendor/bin/pint` is available (`laravel/pint` is in dev deps).

**Project-Specific Conventions & Patterns**
- **Config-driven filters and lists:** Controllers use `Config::get('<module>.filters')`, `Config::get('<module>.order_by')`, `Config::get('<module>.status')`. Inspect `app/Modules/*/Config/config.php` to find defaults used across controllers (e.g. pagination, default search, order options).
- **Route prefixes:** Module routes are often exposed under a prefix (e.g. the Clients `Firms` routes live under `prefix('business')` inside `app/Modules/Clients/Config/routes.php` which itself is mounted under the `users`/`clients` prefix in `bootstrap/app.php`). Check both the module `routes.php` and `bootstrap/app.php` to understand final URIs.
- **Soft deletes workflow:** Controllers use Eloquent `onlyTrashed()` / `withTrashed()` / `forceDelete()` patterns for trash/restore/delete endpoints — follow this pattern when adding similar resources.
- **Guid generation:** Modules use a `Guid` helper and `Str::random(8)` for short guids; search `app/Helpers` and `App\Helpers` usages when you need to reuse or modify guid logic.
- **Response conventions:** Always return `sendResponse('CODE', $payload)` or `sendError('CODE')` — many clients expect the shape seen in `BaseController`.

**Testing Tips & Gotchas**
- `phpunit.xml` sets `DB_CONNECTION=sqlite` and `DB_DATABASE=:memory:` for tests — use factories and avoid relying on persistent DB state in tests.
- Authentication endpoints use Sanctum (`laravel/sanctum`) — tests that call protected module routes must authenticate via Sanctum tokens or use `actingAs()` helpers.

**Integration & External Dependencies**
- Key libraries: `laravel/sanctum` (auth), `spatie/laravel-permission` (roles/permissions), `mpdf/phpword` (document generation), `torann/geoip` (geo lookups), and Symfony HTTP/mailer components.
- Mail is configured via `config/mail.php` and may use `symfony/mailgun-mailer` when configured.

**If You Need To Make Changes**
- Add new module: create `app/Modules/<Name>/{Controllers,Models,Config}` and add route file `Config/routes.php`. Register module configs in `AppServiceProvider::register()` and mount routes in `bootstrap/app.php` (follow existing examples).
- Expose config keys with `app('config')->set('my_module', require app_path('Modules/MyModule/Config/config.php'))`.

**Files to Inspect First (quick start)**
- `app/Providers/AppServiceProvider.php` — how module configs are loaded.
- `bootstrap/app.php` — where module routes are mounted and prefixes are defined.
- `app/Modules/*/Config/config.php` — default filters, order_by and status arrays used by controllers.
- `app/Http/Controllers/BaseController.php` — shared response shape and helpers.
- `composer.json` and `package.json` — dev scripts and full dev startup command.

If anything here is unclear or you'd like me to include more examples (e.g. sample requests for a particular controller, how to write a test for Sanctum-protected routes, or merge an existing AGENT.md), tell me which area to expand and I'll iterate.

**Concrete examples (Clients -> Firms controller)**
- **Notes:** The `Clients` module defines routes under `app/Modules/Clients/Config/routes.php` using the `business` prefix. Those routes are protected by `auth:sanctum` middleware — include `Authorization: Bearer <token>` when calling them. Final URL may include an outer prefix depending on how `bootstrap/app.php` mounts module routes.

- Create business (POST):

	Request (POST `/business/create`)

	Headers:
	- `Authorization: Bearer <SANCTUM_TOKEN>`
	- `Content-Type: application/json`

	Body:
	```json
	{
		"firm_name": "Acme Consulting",
		"contact_email": "info@acme.example",
		"contact_mobile": "27123456789",
		"city": "Cape Town",
		"country": "South Africa",
		"country_code": "ZA"
	}
	```

	Successful response (HTTP 200):
	```json
	{
		"success": true,
		"message": "RECORD_CREATED",
		"payload": {
			"id": 12,
			"guid": "a1b2c3d4",
			"firm_name": "Acme Consulting",
			"contact_email": "info@acme.example",
			"contact_mobile": "27123456789",
			"city": "Cape Town",
			"country": "South Africa",
			"country_code": "ZA",
			"created_at": "2025-12-10T12:00:00.000000Z",
			"updated_at": "2025-12-10T12:00:00.000000Z"
		}
	}
	```

- Get all businesses (POST):

	Request (POST `/business/all`)

	Body (optional filters):
	```json
	{ "search": "Acme", "results_per_page": 10, "page": 1 }
	```

	Successful response (HTTP 200) when records found:
	```json
	{
		"success": true,
		"message": "RECORDS_FOUND",
		"payload": {
			"meta": {
				"first_page": 1,
				"last_page": 3,
				"current_page": 1,
				"num_results": 10,
				"total_results": 25
			},
			"data": [ { "guid": "a1b2c3d4", "firm_name": "Acme Consulting", "city": "Cape Town" } ]
		}
	}
	```

- View single business (POST):

	Request (POST `/business/{guid}/view`)

	Successful response (HTTP 200):
	```json
	{
		"success": true,
		"message": "RECORDS_FOUND",
		"payload": { "guid": "a1b2c3d4", "firm_name": "Acme Consulting", "city": "Cape Town" }
	}
	```

- Edit business (POST):

	Request (POST `/business/{guid}/edit`)

	Body (only fields to update):
	```json
	{ "city": "Johannesburg", "contact_mobile": "27119998877" }
	```

	Successful response (HTTP 200):
	```json
	{ "success": true, "message": "RECORD_UPDATED", "payload": { "guid": "a1b2c3d4", "city": "Johannesburg" } }
	```

**Example Pest feature test (sanctum-protected)**

```php
use App\Models\User;
use Laravel\Sanctum\Sanctum;

it('creates a business', function () {
		$user = User::factory()->create();
		Sanctum::actingAs($user);

		$payload = [ 'firm_name' => 'Acme Test' ];
		$response = $this->postJson('/business/create', $payload);

		$response->assertStatus(200)->assertJson([ 'success' => true, 'message' => 'RECORD_CREATED' ]);
});
```
