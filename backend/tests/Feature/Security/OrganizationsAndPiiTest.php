<?php

use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\DB;
use Laravel\Sanctum\Sanctum;
use App\Modules\Organizations\Models\OrganizationRole;
use App\Modules\Organizations\Models\OrganizationUserAssignment;

uses(RefreshDatabase::class);

beforeEach(fn () => seedAuthReferenceData());

/*
|--------------------------------------------------------------------------
| Organizations module's own admin endpoints — previously had no
| authorization beyond auth:sanctum at all.
|--------------------------------------------------------------------------
*/

it('denies a Client managing the org-role catalog', function () {
    Sanctum::actingAs(makeUser('Client'));

    $this->postJson('/organizations/roles/all')->assertForbidden();
});

it('denies a Client assigning an org-role to a firm', function () {
    $firm = makeFirm();
    $dataloader = OrganizationRole::where('code', 'dataloader')->firstOrFail();
    Sanctum::actingAs(makeUser('Client'));

    $this->postJson("/organizations/firms/{$firm->guid}/members/assign", [
        'user_id' => makeUser('Accountant')->id,
        'organization_role_id' => $dataloader->id,
    ])->assertForbidden();
});

it('allows an Accountant (holds organizations.assign) to assign an org-role', function () {
    $firm = makeFirm();
    $target = makeUser('Accountant');
    $dataloader = OrganizationRole::where('code', 'dataloader')->firstOrFail();
    Sanctum::actingAs(makeUser('Accountant'));

    $this->postJson("/organizations/firms/{$firm->guid}/members/assign", [
        'user_id' => $target->id,
        'organization_role_id' => $dataloader->id,
    ])->assertOk();

    expect(OrganizationUserAssignment::where('firm_id', $firm->id)->where('user_id', $target->id)->exists())->toBeTrue();
});

/*
|--------------------------------------------------------------------------
| A user can hold multiple different org roles on the same firm (Phase 2
| fix — assignRole() used to block a second assignment for the same user).
|--------------------------------------------------------------------------
*/

it('lets a user hold two different org roles on the same firm', function () {
    $firm = makeFirm();
    $accountant = makeUser('Accountant');

    assignOrgRole($accountant, $firm, 'senior');
    assignOrgRole($accountant, $firm, 'dataloader');

    expect(OrganizationUserAssignment::where('firm_id', $firm->id)->where('user_id', $accountant->id)->count())
        ->toBe(2);
});

/*
|--------------------------------------------------------------------------
| SIN masking — getOne() must never return the raw sin_number once it's
| computed the masked copy.
|--------------------------------------------------------------------------
*/

it('never returns the raw SIN, only the masked copy', function () {
    $target = makeUser('Client', ['meta' => ['sin_number' => '123456789']]);
    Sanctum::actingAs(makeUser('Accountant')); // holds users.view

    $response = $this->postJson("/users/{$target->guid}/view");

    $response->assertOk();
    expect($response->json('payload.meta.sin_number'))->toBeNull();
    expect($response->json('payload.meta.sin_number_masked'))->toBe('******789');
});

/*
|--------------------------------------------------------------------------
| PII encryption at rest — users.meta must not be plaintext JSON in the DB.
|--------------------------------------------------------------------------
*/

it('stores users.meta encrypted, not as plaintext JSON', function () {
    $user = makeUser('Client', ['meta' => ['sin_number' => '987654321']]);

    $raw = DB::table('users')->where('id', $user->id)->value('meta');

    expect($raw)->not->toBeNull();
    expect(str_starts_with($raw, '{'))->toBeFalse(); // not readable JSON
    expect($raw)->not->toContain('987654321'); // raw SIN not present in ciphertext

    // But the model transparently decrypts it back.
    expect($user->fresh()->meta['sin_number'])->toBe('987654321');
});
