<?php

use Illuminate\Foundation\Testing\RefreshDatabase;
use Laravel\Sanctum\Sanctum;

uses(RefreshDatabase::class);

beforeEach(fn () => seedAuthReferenceData());

/*
|--------------------------------------------------------------------------
| Documents::listTaxfilerDocuments — self-or-staff. user_id is a small
| sequential integer here (not a guid), which is exactly what made this
| class of bug so easy to exploit before this week's fix.
|--------------------------------------------------------------------------
*/

it('allows a Taxfiler to view their own documents', function () {
    $taxfilerA = makeUser('Taxfiler');
    Sanctum::actingAs($taxfilerA);

    $this->postJson("/individual/taxfilers/{$taxfilerA->id}/documents")->assertOk();
});

it('denies a Taxfiler viewing a DIFFERENT taxfiler\'s documents', function () {
    $taxfilerA = makeUser('Taxfiler');
    $taxfilerB = makeUser('Taxfiler');
    Sanctum::actingAs($taxfilerA);

    $this->postJson("/individual/taxfilers/{$taxfilerB->id}/documents")->assertForbidden();
});

it('allows an Accountant to view any taxfiler\'s documents', function () {
    $taxfiler = makeUser('Taxfiler');
    Sanctum::actingAs(makeUser('Accountant'));

    $this->postJson("/individual/taxfilers/{$taxfiler->id}/documents")->assertOk();
});

it('allows Admin to view any taxfiler\'s documents', function () {
    $taxfiler = makeUser('Taxfiler');
    Sanctum::actingAs(makeUser('Admin'));

    $this->postJson("/individual/taxfilers/{$taxfiler->id}/documents")->assertOk();
});

/*
|--------------------------------------------------------------------------
| Category::create — global reference data (tax_categories), manage-tier,
| no self-service angle at all: a Taxfiler should never touch this.
|--------------------------------------------------------------------------
*/

it('denies a Taxfiler creating a global tax category', function () {
    Sanctum::actingAs(makeUser('Taxfiler'));

    $this->postJson('/individual/categories/create', [
        'name' => 'X', 'code' => 'X' . random_int(1000, 9999), 'description' => 'd',
    ])->assertForbidden();
});

it('allows an Accountant to create a global tax category', function () {
    Sanctum::actingAs(makeUser('Accountant'));

    $this->postJson('/individual/categories/create', [
        'name' => 'X', 'code' => 'X' . random_int(1000, 9999), 'description' => 'd',
    ])->assertOk();
});

/*
|--------------------------------------------------------------------------
| Documents::status — approve-tier, NEVER self-fallback: a Taxfiler can
| never approve/self-certify their own submitted document.
|--------------------------------------------------------------------------
*/

it('denies a Taxfiler self-approving their own tax document', function () {
    $taxfiler = makeUser('Taxfiler');
    Sanctum::actingAs($taxfiler);

    $this->postJson('/individual/taxcategory/999999/documents/status', [
        'user_id' => $taxfiler->id, 'file_hash' => 'x', 'status' => 'approved',
    ])->assertForbidden();
});

it('lets an Accountant past the approve-tier gate for tax documents (fails downstream, not on authorization)', function () {
    $taxfiler = makeUser('Taxfiler');
    Sanctum::actingAs(makeUser('Accountant'));

    $response = $this->postJson('/individual/taxcategory/999999/documents/status', [
        'user_id' => $taxfiler->id, 'file_hash' => 'x', 'status' => 'approved',
    ]);

    $response->assertStatus(501);
    expect($response->json('message'))->toBe('SUBCATEGORY_NOT_FOUND');
});

/*
|--------------------------------------------------------------------------
| Users::listTaxfilers — bulk taxfiler directory, staff-only (same shape as
| the Users module's getAll)
|--------------------------------------------------------------------------
*/

it('denies a Taxfiler listing all taxfilers', function () {
    Sanctum::actingAs(makeUser('Taxfiler'));

    $this->postJson('/individual/taxfilers')->assertForbidden();
});

it('allows an Accountant to list all taxfilers', function () {
    Sanctum::actingAs(makeUser('Accountant'));

    $this->postJson('/individual/taxfilers')->assertOk();
});
