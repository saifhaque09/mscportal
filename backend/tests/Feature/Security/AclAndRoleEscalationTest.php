<?php

use Illuminate\Foundation\Testing\RefreshDatabase;
use Laravel\Sanctum\Sanctum;
use App\Modules\Users\Models\Role as RoleModel;

uses(RefreshDatabase::class);

beforeEach(fn () => seedAuthReferenceData());

/*
|--------------------------------------------------------------------------
| ACL endpoints — previously registered with no auth middleware at all
|--------------------------------------------------------------------------
*/

it('rejects a guest (no auth) on the acl/get endpoint', function () {
    $this->postJson('/acl/get')->assertUnauthorized();
});

it('rejects a non-admin authenticated user on acl/get', function () {
    Sanctum::actingAs(makeUser('Client'));

    $this->postJson('/acl/get')->assertForbidden();
});

it('rejects a non-admin authenticated user on acl/add', function () {
    Sanctum::actingAs(makeUser('Accountant'));

    $this->postJson('/acl/add', [
        'role' => 'Admin',
        'path' => '/anything',
        'category' => 'url',
        'title' => 'x',
    ])->assertForbidden();
});

it('allows an Admin on acl/get', function () {
    Sanctum::actingAs(makeUser('Admin'));

    $this->postJson('/acl/get')->assertOk();
});

it('rejects a non-admin on the bulk role-assignment endpoint (setRoles)', function () {
    Sanctum::actingAs(makeUser('Client'));

    $this->postJson('/setRoles')->assertForbidden();
});

/*
|--------------------------------------------------------------------------
| Role assignment — previously let any authenticated user grant themselves
| Admin via users/roles/{id}/addUsers
|--------------------------------------------------------------------------
*/

it('blocks a low-privilege user from assigning themselves the Admin role', function () {
    $client = makeUser('Client');
    Sanctum::actingAs($client);

    $adminRole = RoleModel::where('name', 'Admin')->firstOrFail();

    $response = $this->postJson("/users/roles/{$adminRole->id}/addUsers", [
        'users' => [$client->guid],
    ]);

    $response->assertForbidden();

    expect($client->fresh()->hasRole('Admin'))->toBeFalse();
});

it('denies roles.assign to every seeded role except Admin (no one holds it in PermissionSeeder)', function () {
    // Confirms current, intentional behavior: unlike organizations.assign
    // (which Accountant/Staff hold, scoped to one firm), platform role
    // assignment — which can reach Admin itself — is Admin-only. If this
    // test starts failing because a role suddenly holds roles.assign, that's
    // a real escalation-surface change worth reviewing deliberately, not a
    // silent PermissionSeeder edit.
    $accountant = makeUser('Accountant');
    $target = makeUser('Client');
    Sanctum::actingAs($accountant);

    $employeeRole = RoleModel::where('name', 'Employee')->firstOrFail();

    $response = $this->postJson("/users/roles/{$employeeRole->id}/addUsers", [
        'users' => [$target->guid],
    ]);

    $response->assertForbidden();
    expect($target->fresh()->hasRole('Employee'))->toBeFalse();
});

it('lets Admin bypass the role-assignment permission check entirely', function () {
    $admin = makeUser('Admin');
    $target = makeUser('Client');
    Sanctum::actingAs($admin);

    $adminRole = RoleModel::where('name', 'Admin')->firstOrFail();

    $response = $this->postJson("/users/roles/{$adminRole->id}/addUsers", [
        'users' => [$target->guid],
    ]);

    $response->assertOk();
    expect($target->fresh()->hasRole('Admin'))->toBeTrue();
});
