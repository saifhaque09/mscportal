<?php

use Illuminate\Foundation\Testing\RefreshDatabase;
use Laravel\Sanctum\Sanctum;
use App\Modules\Clients\Models\Checklist;

uses(RefreshDatabase::class);

beforeEach(fn () => seedAuthReferenceData());

/*
|--------------------------------------------------------------------------
| Firms::create — Admin only (business rule from this week)
|--------------------------------------------------------------------------
*/

it('denies Accountant creating a firm', function () {
    Sanctum::actingAs(makeUser('Accountant'));

    $this->postJson('/clients/business/create', [
        'firm_name' => 'New Co', 'address' => '1 Main St',
    ])->assertForbidden();
});

it('allows Admin to create a firm', function () {
    Sanctum::actingAs(makeUser('Admin'));

    $this->postJson('/clients/business/create', [
        'firm_name' => 'New Co', 'address' => '1 Main St',
    ])->assertOk();
});

/*
|--------------------------------------------------------------------------
| Firms::edit — manage-tier, no Client fallback even for their own firm;
| Accountant needs both firms.manage AND an org-assignment on that firm
|--------------------------------------------------------------------------
*/

it('denies a Client editing even their own firm', function () {
    $firm = makeFirm();
    $client = makeUser('Client', ['firm_id' => $firm->id]);
    Sanctum::actingAs($client);

    $this->postJson("/clients/business/{$firm->guid}/edit", ['firm_name' => 'Changed'])
        ->assertForbidden();
});

it('denies an Accountant with no org-assignment on the firm', function () {
    $firm = makeFirm();
    Sanctum::actingAs(makeUser('Accountant'));

    $this->postJson("/clients/business/{$firm->guid}/edit", ['firm_name' => 'Changed'])
        ->assertForbidden();
});

it('allows an Accountant holding lead_acc on that specific firm', function () {
    $firm = makeFirm();
    $accountant = makeUser('Accountant');
    assignOrgRole($accountant, $firm, 'lead_acc');
    Sanctum::actingAs($accountant);

    $this->postJson("/clients/business/{$firm->guid}/edit", ['firm_name' => 'Changed'])
        ->assertOk();
});

it('denies that same Accountant editing a DIFFERENT firm they are not assigned to', function () {
    $assignedFirm = makeFirm();
    $otherFirm = makeFirm();
    $accountant = makeUser('Accountant');
    assignOrgRole($accountant, $assignedFirm, 'lead_acc');
    Sanctum::actingAs($accountant);

    $this->postJson("/clients/business/{$otherFirm->guid}/edit", ['firm_name' => 'Changed'])
        ->assertForbidden();
});

/*
|--------------------------------------------------------------------------
| Firms::view — view-tier, Client CAN reach their own firm (ownership
| fallback), just not anyone else's
|--------------------------------------------------------------------------
*/

it('allows a Client to view their own firm but not another', function () {
    $ownFirm = makeFirm();
    $otherFirm = makeFirm();
    $client = makeUser('Client', ['firm_id' => $ownFirm->id]);
    Sanctum::actingAs($client);

    $this->postJson("/clients/business/{$ownFirm->guid}/view")->assertOk();
    $this->postJson("/clients/business/{$otherFirm->guid}/view")->assertForbidden();
});

/*
|--------------------------------------------------------------------------
| Checklists::create — manage-tier, firm-scoped org-assignment required
|--------------------------------------------------------------------------
*/

it('denies then allows Accountant creating a checklist once assigned to the firm', function () {
    $firm = makeFirm();
    $accountant = makeUser('Accountant');
    Sanctum::actingAs($accountant);

    $this->postJson("/clients/business/{$firm->guid}/checklist/create", ['name' => 'Docs'])
        ->assertForbidden();

    assignOrgRole($accountant, $firm, 'lead_acc');

    $this->postJson("/clients/business/{$firm->guid}/checklist/create", ['name' => 'Docs'])
        ->assertOk();
});

/*
|--------------------------------------------------------------------------
| Documents::status — approve-tier, NEVER self-fallback (a Client can never
| approve their own document, even on their own firm)
|--------------------------------------------------------------------------
*/

it('denies a Client approving a document status on their own firm', function () {
    $firm = makeFirm();
    $client = makeUser('Client', ['firm_id' => $firm->id]);
    // status()/comment() key by the checklist's numeric id, not its code
    // (inconsistent with upload/get/delete, which use code) — pre-existing.
    $checklist = Checklist::create(['firm_id' => $firm->id, 'name' => 'Docs', 'code' => 'CODE' . random_int(1000, 9999)]);
    Sanctum::actingAs($client);

    $this->postJson("/clients/checklist/{$checklist->id}/documents/status", [
        'file_hash' => 'x', 'status' => 'approved',
    ])->assertForbidden();
});

it('lets an assigned Accountant past the approve-tier gate (fails downstream, not on authorization)', function () {
    $firm = makeFirm();
    $accountant = makeUser('Accountant');
    assignOrgRole($accountant, $firm, 'lead_acc');
    $checklist = Checklist::create(['firm_id' => $firm->id, 'name' => 'Docs', 'code' => 'CODE' . random_int(1000, 9999)]);
    Sanctum::actingAs($accountant);

    $response = $this->postJson("/clients/checklist/{$checklist->id}/documents/status", [
        'file_hash' => 'nonexistent-hash', 'status' => 'approved',
    ]);

    // Not 403 — passed authorization, then failed on FILE_NOT_FOUND (default
    // BaseController::sendError code 501), proving the gate isn't what blocks it.
    $response->assertStatus(501);
    expect($response->json('message'))->toBe('FILE_NOT_FOUND');
});

/*
|--------------------------------------------------------------------------
| Documents::getTotalDocuments — view-tier, Client-own-firm fallback
|--------------------------------------------------------------------------
*/

it('allows a Client to view their own firm document totals but not anothers', function () {
    $ownFirm = makeFirm();
    $otherFirm = makeFirm();
    $client = makeUser('Client', ['firm_id' => $ownFirm->id]);
    Sanctum::actingAs($client);

    $this->getJson("/clients/checklist/{$ownFirm->guid}/documents/total")->assertOk();
    $this->getJson("/clients/checklist/{$otherFirm->guid}/documents/total")->assertForbidden();
});
