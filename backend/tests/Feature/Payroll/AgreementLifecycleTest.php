<?php

use App\Modules\Payroll\Models\Agreement;
use App\Modules\Payroll\Models\Setting;
use Illuminate\Foundation\Testing\RefreshDatabase;
use App\Modules\Settings\Models\Setting as AppSetting;
use Illuminate\Support\Facades\DB;
use Laravel\Sanctum\Sanctum;

uses(RefreshDatabase::class);

beforeEach(fn () => seedAuthReferenceData());

/*
|--------------------------------------------------------------------------
| Agreement lifecycle over the four-value status column
|--------------------------------------------------------------------------
|
| status is Pending / Sent / Inactive / Agreed / Reject. Only Inactive still
| needs a timestamp to say which state it means (superseded vs terminated), and
| every guard goes through the Agreement model's predicates. These tests walk
| the whole path, including the version stepping applied on create.
|
*/

/** A firm with an accountant who can act on it, and its client user. */
function agreementScenario(): array
{
    $firm = makeFirm(['payment_type' => 'Bi-Weekly']);

    $accountant = makeUser('Accountant');
    assignOrgRole($accountant, $firm, 'lead_acc');

    return [
        'firm'       => $firm,
        'accountant' => $accountant,
        'client'     => makeUser('Client', ['firm_id' => $firm->id]),
    ];
}

function createAgreement(array $s): Agreement
{
    Sanctum::actingAs($s['accountant']);

    $s['test']->postJson("/payroll/{$s['firm']->guid}/agreements/create", [
        'price' => 100,
        'body'  => 'Payroll services for this firm.',
    ])->assertOk();

    return Agreement::where('firm_id', $s['firm']->id)->latest('id')->first();
}

it('walks draft to sent to agreed', function () {
    $s = agreementScenario() + ['test' => $this];

    $agreement = createAgreement($s);

    // draft: saved, never sent — editable, and not yet acceptable.
    expect($agreement->status)->toBe('Draft')
        ->and($agreement->isDraft())->toBeTrue()
        ->and($agreement->sent_at)->toBeNull()
        ->and($agreement->isUnsent())->toBeTrue()
        ->and($agreement->isAwaitingClient())->toBeFalse()
        ->and($agreement->isEditable())->toBeTrue();

    // A client cannot accept something that was never sent to them.
    Sanctum::actingAs($s['client']);
    $this->postJson("/payroll/{$s['firm']->guid}/agreements/{$agreement->id}/accept", ['accepted' => true])
        ->assertStatus(422)->assertJsonPath('message', 'AGREEMENT_NOT_PENDING_ACCEPTANCE');

    Sanctum::actingAs($s['accountant']);
    $this->postJson("/payroll/{$s['firm']->guid}/agreements/{$agreement->id}/send")->assertOk();

    // Sent is its own status now; sent_at stays as the audit record.
    $agreement->refresh();
    expect($agreement->status)->toBe('Sent')
        ->and($agreement->sent_at)->not->toBeNull()
        ->and($agreement->isUnsent())->toBeFalse()
        ->and($agreement->isAwaitingClient())->toBeTrue()
        ->and($agreement->isEditable())->toBeFalse();

    // Sending twice must still be refused.
    $this->postJson("/payroll/{$s['firm']->guid}/agreements/{$agreement->id}/send")
        ->assertStatus(422)->assertJsonPath('message', 'AGREEMENT_ALREADY_SENT');

    Sanctum::actingAs($s['client']);
    $this->postJson("/payroll/{$s['firm']->guid}/agreements/{$agreement->id}/accept", ['accepted' => true])
        ->assertOk();

    $agreement->refresh();
    expect($agreement->status)->toBe('Agreed')
        ->and($agreement->isAgreed())->toBeTrue();

    // Payroll is switched on by the agreement, not by the settings row.
    $settings = Setting::where('firm_id', $s['firm']->id)->first();
    expect($settings->isActive())->toBeTrue()
        ->and($settings->status)->toBe('Not Started');
});

it('sets Reject on decline and lets the accountant revise and re-send', function () {
    $s = agreementScenario() + ['test' => $this];

    $agreement = createAgreement($s);
    Sanctum::actingAs($s['accountant']);
    $this->postJson("/payroll/{$s['firm']->guid}/agreements/{$agreement->id}/send")->assertOk();

    Sanctum::actingAs($s['client']);
    $this->postJson("/payroll/{$s['firm']->guid}/agreements/{$agreement->id}/decline", [
        'reason' => 'Fee too high',
    ])->assertOk();

    // Reject: back in the accountant's hands, editable. sent_at survives —
    // this version really was posted, and the version list reports that date.
    $agreement->refresh();
    expect($agreement->status)->toBe('Reject')
        ->and($agreement->sent_at)->not->toBeNull()
        ->and($agreement->decline_reason)->toBe('Fee too high')
        ->and($agreement->isUnsent())->toBeTrue()
        ->and($agreement->isEditable())->toBeTrue();

    // Re-sending the revised agreement puts it back with the client.
    Sanctum::actingAs($s['accountant']);
    $this->postJson("/payroll/{$s['firm']->guid}/agreements/{$agreement->id}/send")->assertOk();

    $agreement->refresh();
    expect($agreement->status)->toBe('Sent')
        ->and($agreement->isAwaitingClient())->toBeTrue()
        ->and($agreement->decline_reason)->toBeNull();
});

it('keeps superseded and terminated apart inside Inactive', function () {
    $s = agreementScenario() + ['test' => $this];

    // v1, agreed.
    $first = createAgreement($s);
    Sanctum::actingAs($s['accountant']);
    $this->postJson("/payroll/{$s['firm']->guid}/agreements/{$first->id}/send")->assertOk();
    Sanctum::actingAs($s['client']);
    $this->postJson("/payroll/{$s['firm']->guid}/agreements/{$first->id}/accept", ['accepted' => true])->assertOk();

    // v2, agreed — which supersedes v1.
    $second = createAgreement($s);
    Sanctum::actingAs($s['accountant']);
    $this->postJson("/payroll/{$s['firm']->guid}/agreements/{$second->id}/send")->assertOk();
    Sanctum::actingAs($s['client']);
    $this->postJson("/payroll/{$s['firm']->guid}/agreements/{$second->id}/accept", ['accepted' => true])->assertOk();

    // Superseded: Inactive, no terminated_at. Accepting must not supersede the
    // agreement being accepted.
    $first->refresh();
    $second->refresh();
    expect($first->status)->toBe('Inactive')
        ->and($first->terminated_at)->toBeNull()
        ->and($second->status)->toBe('Agreed');

    Sanctum::actingAs($s['accountant']);
    $this->postJson("/payroll/{$s['firm']->guid}/agreements/{$second->id}/terminate", [
        'reason' => 'Client left',
    ])->assertOk();

    // Terminated: also Inactive, but terminated_at is what tells them apart.
    $second->refresh();
    expect($second->status)->toBe('Inactive')
        ->and($second->terminated_at)->not->toBeNull();

    // With no agreed agreement left, payroll is off again.
    expect(Setting::where('firm_id', $s['firm']->id)->first()->isActive())->toBeFalse();
});

it('assigns versions in tenths, rolling 1.9 to 2.0', function () {
    $s = agreementScenario() + ['test' => $this];

    // Ten agreements: 1.0 through 1.9, then the eleventh must roll to 2.0
    // rather than becoming 1.10.
    $versions = [];
    for ($i = 0; $i < 11; $i++) {
        $versions[] = createAgreement($s)->version;
    }

    expect($versions)->toBe([
        '1.0', '1.1', '1.2', '1.3', '1.4', '1.5', '1.6', '1.7', '1.8', '1.9', '2.0',
    ]);
});

it('stores the agreement content entered on create', function () {
    $s = agreementScenario() + ['test' => $this];

    Sanctum::actingAs($s['accountant']);
    $this->postJson("/payroll/{$s['firm']->guid}/agreements/create", [
        'title'          => 'Payroll Services Agreement',
        'body'           => 'The accountant will process payroll each cycle.',
        'effective_date' => '2026-09-01',
        'price_type'     => 'per person',
        'price'          => 12.50,
    ])->assertOk();

    $agreement = Agreement::where('firm_id', $s['firm']->id)->latest('id')->first();

    expect($agreement->title)->toBe('Payroll Services Agreement')
        ->and($agreement->body)->toBe('The accountant will process payroll each cycle.')
        ->and($agreement->effective_date->toDateString())->toBe('2026-09-01')
        ->and($agreement->price_type)->toBe('per person')
        ->and((float) $agreement->price)->toBe(12.50)
        ->and($agreement->version)->toBe('1.0')
        ->and($agreement->status)->toBe('Draft');

    // price_type is a closed set.
    $this->postJson("/payroll/{$s['firm']->guid}/agreements/create", ['price_type' => 'hourly'])
        ->assertStatus(422);
});

/*
|--------------------------------------------------------------------------
| Delete
|--------------------------------------------------------------------------
|
| A hard delete, allowed only on a draft the client has never seen. Everything
| the client has seen is revised (update + re-send) or ended (terminate), never
| removed — the acceptance table cascades on delete, so a permitted delete of an
| accepted agreement would silently destroy the evidence of what was agreed.
|
*/

it('deletes a draft the client has never seen', function () {
    $s = agreementScenario() + ['test' => $this];

    $agreement = createAgreement($s);
    expect($agreement->isDeletable())->toBeTrue();

    Sanctum::actingAs($s['accountant']);
    $this->postJson("/payroll/{$s['firm']->guid}/agreements/{$agreement->id}/delete")
        ->assertOk()->assertJsonPath('message', 'AGREEMENT_DELETED');

    expect(Agreement::find($agreement->id))->toBeNull();

    // The freed version number is reused — nobody outside the firm saw 1.0.
    $next = createAgreement($s);
    expect($next->version)->toBe('1.0');
});

it('refuses to delete an agreement once it has been sent', function () {
    $s = agreementScenario() + ['test' => $this];

    $agreement = createAgreement($s);

    Sanctum::actingAs($s['accountant']);
    $this->postJson("/payroll/{$s['firm']->guid}/agreements/{$agreement->id}/send")->assertOk();

    $this->postJson("/payroll/{$s['firm']->guid}/agreements/{$agreement->id}/delete")
        ->assertStatus(422)->assertJsonPath('message', 'AGREEMENT_NOT_DELETABLE');

    expect(Agreement::find($agreement->id))->not->toBeNull();
});

it('refuses to delete a declined or an accepted agreement', function () {
    $s = agreementScenario() + ['test' => $this];

    // Declined: back in the accountant's hands, but the client has seen it, so
    // it is revised through update() rather than deleted.
    $declined = createAgreement($s);
    Sanctum::actingAs($s['accountant']);
    $this->postJson("/payroll/{$s['firm']->guid}/agreements/{$declined->id}/send")->assertOk();
    Sanctum::actingAs($s['client']);
    $this->postJson("/payroll/{$s['firm']->guid}/agreements/{$declined->id}/decline", ['reason' => 'too costly'])->assertOk();

    expect($declined->fresh()->status)->toBe('Reject')
        ->and($declined->fresh()->isEditable())->toBeTrue()
        ->and($declined->fresh()->isDeletable())->toBeFalse();

    Sanctum::actingAs($s['accountant']);
    $this->postJson("/payroll/{$s['firm']->guid}/agreements/{$declined->id}/delete")
        ->assertStatus(422)->assertJsonPath('message', 'AGREEMENT_NOT_DELETABLE');

    // Accepted: the acceptance row must survive.
    $accepted = createAgreement($s);
    Sanctum::actingAs($s['accountant']);
    $this->postJson("/payroll/{$s['firm']->guid}/agreements/{$accepted->id}/send")->assertOk();
    Sanctum::actingAs($s['client']);
    $this->postJson("/payroll/{$s['firm']->guid}/agreements/{$accepted->id}/accept", [
        'accepted' => true, 'accepted_name' => 'A Client',
    ])->assertOk();

    Sanctum::actingAs($s['accountant']);
    $this->postJson("/payroll/{$s['firm']->guid}/agreements/{$accepted->id}/delete")
        ->assertStatus(422)->assertJsonPath('message', 'AGREEMENT_NOT_DELETABLE');

    expect($accepted->fresh())->not->toBeNull()
        ->and($accepted->fresh()->acceptance)->not->toBeNull();
});

it('refuses a delete from a caller without payroll manage rights', function () {
    $s = agreementScenario() + ['test' => $this];

    $agreement = createAgreement($s);

    // The firm's own client user can view an agreement but never remove one.
    Sanctum::actingAs($s['client']);
    $this->postJson("/payroll/{$s['firm']->guid}/agreements/{$agreement->id}/delete")
        ->assertStatus(403)->assertJsonPath('message', 'UNAUTHORIZED');

    expect(Agreement::find($agreement->id))->not->toBeNull();
});

it('404s deleting an agreement that belongs to another firm', function () {
    $s = agreementScenario() + ['test' => $this];
    $agreement = createAgreement($s);

    $other = agreementScenario() + ['test' => $this];

    Sanctum::actingAs($other['accountant']);
    $this->postJson("/payroll/{$other['firm']->guid}/agreements/{$agreement->id}/delete")
        ->assertStatus(404)->assertJsonPath('message', 'AGREEMENT_NOT_FOUND');

    expect(Agreement::find($agreement->id))->not->toBeNull();
});

/*
|--------------------------------------------------------------------------
| One column per fact, with the retired names still accepted as input
|--------------------------------------------------------------------------
|
| The fee used to live in both price/price_type and fee_amount/fee_basis, the
| start date in both effective_date and service_start_date, and the text in both
| body and terms. Each pair collapsed to one column on 2026-08-25; create/update
| still take the retired names and fold them onto the survivor.
|
*/

it('accepts the retired field names on create and folds them onto the survivors', function () {
    $s = agreementScenario() + ['test' => $this];

    Sanctum::actingAs($s['accountant']);
    $this->postJson("/payroll/{$s['firm']->guid}/agreements/create", [
        'service_start_date' => '2026-04-01',
        'service_end_date'   => '2026-10-31',
        'fee_amount'         => 250,
        'fee_currency'       => 'USD',
        'fee_basis'          => 'per_employee_per_run',
        'terms'              => ['services_provided' => 'Payroll', 'notice_period' => '30 days'],
        'included_services'  => ['Payslips', 'ROE filing'],
    ])->assertOk();

    $agreement = Agreement::where('firm_id', $s['firm']->id)->latest('id')->first();

    expect($agreement->effective_date->toDateString())->toBe('2026-04-01')
        ->and($agreement->end_date->toDateString())->toBe('2026-10-31')
        ->and((float) $agreement->price)->toBe(250.0)
        ->and($agreement->currency)->toBe('USD')
        ->and($agreement->price_type)->toBe('per person')
        // The JSON pair becomes the prose body it was duplicating.
        ->and($agreement->body)->toContain('Services provided: Payroll')
        ->and($agreement->body)->toContain('Notice period: 30 days')
        ->and($agreement->body)->toContain('Included services: Payslips, ROE filing');
});

it('prefers the canonical field when both names are sent', function () {
    $s = agreementScenario() + ['test' => $this];

    Sanctum::actingAs($s['accountant']);
    $this->postJson("/payroll/{$s['firm']->guid}/agreements/create", [
        'price'              => 22,
        'fee_amount'         => 11,
        'effective_date'     => '2026-06-01',
        'service_start_date' => '2020-01-01',
        'body'               => 'Real body text.',
        'terms'              => ['services_provided' => 'Ignored'],
    ])->assertOk();

    $agreement = Agreement::where('firm_id', $s['firm']->id)->latest('id')->first();

    expect((float) $agreement->price)->toBe(22.0)
        ->and($agreement->effective_date->toDateString())->toBe('2026-06-01')
        ->and($agreement->body)->toBe('Real body text.');
});

it('still validates a retired field under its old rules', function () {
    $s = agreementScenario() + ['test' => $this];

    Sanctum::actingAs($s['accountant']);

    // A bad legacy value must fail loudly rather than be dropped on the way
    // through the alias mapping.
    $this->postJson("/payroll/{$s['firm']->guid}/agreements/create", ['fee_basis' => 'hourly'])
        ->assertStatus(422);

    $this->postJson("/payroll/{$s['firm']->guid}/agreements/create", ['fee_amount' => -5])
        ->assertStatus(422);

    // monthly_flat has no price_type equivalent: the amount lands, the type
    // stays null rather than being guessed.
    $this->postJson("/payroll/{$s['firm']->guid}/agreements/create", [
        'fee_amount' => 99.99,
        'fee_basis'  => 'monthly_flat',
    ])->assertOk();

    $agreement = Agreement::where('firm_id', $s['firm']->id)->latest('id')->first();
    expect((float) $agreement->price)->toBe(99.99)->and($agreement->price_type)->toBeNull();
});

it('edits through a retired name without blanking the other fields', function () {
    $s = agreementScenario() + ['test' => $this];
    $agreement = createAgreement($s);

    Sanctum::actingAs($s['accountant']);
    $this->postJson("/payroll/{$s['firm']->guid}/agreements/{$agreement->id}/update", [
        'fee_amount' => 500,
    ])->assertOk();

    $agreement->refresh();

    expect((float) $agreement->price)->toBe(500.0)
        // createAgreement() set the body; a partial edit must leave it alone.
        ->and($agreement->body)->toBe('Payroll services for this firm.');
});

it('requires content, not a terms array, before an agreement can be sent', function () {
    $s = agreementScenario() + ['test' => $this];

    Sanctum::actingAs($s['accountant']);
    $this->postJson("/payroll/{$s['firm']->guid}/agreements/create", ['price' => 100])->assertOk();

    $empty = Agreement::where('firm_id', $s['firm']->id)->latest('id')->first();

    $this->postJson("/payroll/{$s['firm']->guid}/agreements/{$empty->id}/send")
        ->assertStatus(422)->assertJsonPath('message', 'AGREEMENT_CONTENT_REQUIRED');

    // Filling in the body — the field real agreements actually use — is enough.
    $this->postJson("/payroll/{$s['firm']->guid}/agreements/{$empty->id}/update", [
        'body' => 'Payroll services for this firm.',
    ])->assertOk();

    $this->postJson("/payroll/{$s['firm']->guid}/agreements/{$empty->id}/send")->assertOk();
});

it('hashes the agreed content, not an empty clause set', function () {
    $s = agreementScenario() + ['test' => $this];
    $agreement = createAgreement($s);

    Sanctum::actingAs($s['accountant']);
    $this->postJson("/payroll/{$s['firm']->guid}/agreements/{$agreement->id}/send")->assertOk();

    Sanctum::actingAs($s['client']);
    $this->postJson("/payroll/{$s['firm']->guid}/agreements/{$agreement->id}/accept", [
        'accepted' => true, 'accepted_name' => 'A Client',
    ])->assertOk();

    $agreement->refresh();
    $hash = $agreement->acceptance->content_hash;

    // It is the hash of THIS agreement's content, and re-reading the row
    // reproduces it exactly.
    expect($hash)->toBe(Agreement::hashContent($agreement))
        ->and($hash)->toHaveLength(64);

    // A different body would have produced a different hash — i.e. the content
    // is genuinely covered, which it was not while `terms` sat empty.
    $agreement->body = 'Something else entirely.';
    expect(Agreement::hashContent($agreement))->not->toBe($hash);
});

/*
|--------------------------------------------------------------------------
| Draft
|--------------------------------------------------------------------------
|
| Saving an agreement lists it as a draft. 'Draft' was split out of 'Pending',
| which had been carrying both "saved, not sent" and — as the value the queue
| reports for a missing row — "no agreement raised yet".
|
*/

it('saves a new agreement as a Draft', function () {
    $s = agreementScenario() + ['test' => $this];

    Sanctum::actingAs($s['accountant']);
    $response = $this->postJson("/payroll/{$s['firm']->guid}/agreements/create", [
        'title' => 'Payroll Services Agreement',
        'body'  => 'Payroll services for this firm.',
    ])->assertOk();

    expect($response->json('payload.status'))->toBe('Draft');

    $agreement = Agreement::where('firm_id', $s['firm']->id)->latest('id')->first();

    // A draft is the accountant's to edit, delete, or send.
    expect($agreement->status)->toBe('Draft')
        ->and($agreement->isDraft())->toBeTrue()
        ->and($agreement->isUnsent())->toBeTrue()
        ->and($agreement->isEditable())->toBeTrue()
        ->and($agreement->isDeletable())->toBeTrue()
        ->and($agreement->isAwaitingClient())->toBeFalse();
});

it('keeps a draft listed as Draft through an edit, and moves it off Draft on send', function () {
    $s = agreementScenario() + ['test' => $this];
    $agreement = createAgreement($s);

    Sanctum::actingAs($s['accountant']);
    $this->postJson("/payroll/{$s['firm']->guid}/agreements/{$agreement->id}/update", [
        'title' => 'Revised before sending',
    ])->assertOk();

    expect($agreement->fresh()->status)->toBe('Draft');

    $this->postJson("/payroll/{$s['firm']->guid}/agreements/{$agreement->id}/send")->assertOk();

    expect($agreement->fresh()->status)->toBe('Sent')
        ->and($agreement->fresh()->isDraft())->toBeFalse();
});

it('lists drafts under the Draft filter and counts a draft as a live agreement', function () {
    $s = agreementScenario() + ['test' => $this];
    $agreement = createAgreement($s);

    Sanctum::actingAs($s['accountant']);

    $drafts = $this->postJson("/payroll/{$s['firm']->guid}/agreements/all", ['status' => 'Draft'])
        ->assertOk()->json('payload.data');

    expect(collect($drafts)->pluck('id'))->toContain($agreement->id);

    // A draft is still the firm's live agreement, so a second one cannot be
    // raised beside it.
    expect(Agreement::LIVE)->toContain('Draft');

    $row = collect($this->postJson('/payroll/review/queue')->assertOk()->json('payload.data'))
        ->firstWhere('id', $s['firm']->id);

    expect($row['agreement_status'])->toBe('Draft')
        ->and($row['can_create_agreement'])->toBeFalse();
});

it('separates a saved draft from a firm that has raised nothing', function () {
    $withDraft = agreementScenario() + ['test' => $this];
    createAgreement($withDraft);

    // Same accountant, a second firm they are assigned to, no agreement on it.
    $bare = makeFirm(['payment_type' => 'Bi-Weekly']);
    assignOrgRole($withDraft['accountant'], $bare, 'lead_acc');

    Sanctum::actingAs($withDraft['accountant']);
    $rows = collect($this->postJson('/payroll/review/queue')->assertOk()->json('payload.data'))
        ->keyBy('id');

    // The two states that used to share the word 'Pending'.
    expect($rows[$withDraft['firm']->id]['agreement_status'])->toBe('Draft')
        ->and($rows[$bare->id]['agreement_status'])->toBe('Pending')
        ->and($rows[$bare->id]['current_agreement'])->toBeNull()
        ->and($rows[$bare->id]['can_create_agreement'])->toBeTrue();

    // And each filter now returns only its own firm.
    $names = fn (array $filters) => collect($this->postJson('/payroll/review/queue', $filters)
        ->assertOk()->json('payload.data'))->pluck('id')->all();

    expect($names(['agreement_status' => 'Draft']))->toBe([$withDraft['firm']->id])
        ->and($names(['agreement_status' => 'Pending']))->toBe([$bare->id]);
});

/*
|--------------------------------------------------------------------------
| Version history
|--------------------------------------------------------------------------
|
| Each revision is its own row, so agreements/all IS the version list. It
| carries the three display fields that table needs: which version, the date it
| was posted to the client, and who the client is.
|
*/

it('lists every version with its number, posted date and client', function () {
    $s = agreementScenario() + ['test' => $this];

    // v1.0 goes out to the client; v1.1 is raised after it is declined.
    $first = createAgreement($s);
    Sanctum::actingAs($s['accountant']);
    $this->postJson("/payroll/{$s['firm']->guid}/agreements/{$first->id}/send")->assertOk();

    Sanctum::actingAs($s['client']);
    $this->postJson("/payroll/{$s['firm']->guid}/agreements/{$first->id}/decline", ['reason' => 'too costly'])->assertOk();

    $second = createAgreement($s);

    Sanctum::actingAs($s['accountant']);
    $rows = collect($this->postJson("/payroll/{$s['firm']->guid}/agreements/all")
        ->assertOk()->json('payload.data'));

    expect($rows)->toHaveCount(2);

    // Newest revision first.
    expect($rows->pluck('version')->all())->toBe(['1.1', '1.0']);

    $v11 = $rows->firstWhere('version', '1.1');
    $v10 = $rows->firstWhere('version', '1.0');

    // The draft has never been posted, so it has no posted date and no recipient.
    expect($v11['status'])->toBe('Draft')
        ->and($v11['posted_date'])->toBeNull()
        ->and($v11['sent_to'])->toBeNull()
        ->and($v11['client_name'])->toBe($s['firm']->firm_name);

    // The one that went out carries both.
    $clientName = trim($s['client']->first_name . ' ' . $s['client']->last_name);

    expect($v10['status'])->toBe('Reject')
        ->and($v10['posted_date'])->toBe(now()->format('Y-m-d'))
        ->and($v10['sent_to'])->toContain($clientName)
        ->and($v10['client_name'])->toBe($s['firm']->firm_name);
});

it('resolves the version list recipients in one query regardless of how many versions', function () {
    $s = agreementScenario() + ['test' => $this];

    foreach (range(1, 5) as $i) {
        $agreement = createAgreement($s);
        Sanctum::actingAs($s['accountant']);
        $this->postJson("/payroll/{$s['firm']->guid}/agreements/{$agreement->id}/send")->assertOk();
        // Decline it so the next create is allowed.
        Sanctum::actingAs($s['client']);
        $this->postJson("/payroll/{$s['firm']->guid}/agreements/{$agreement->id}/decline", ['reason' => 'no'])->assertOk();
        Sanctum::actingAs($s['accountant']);
    }

    $count = 0;
    DB::listen(function () use (&$count) {
        $count++;
    });

    $rows = collect($this->postJson("/payroll/{$s['firm']->guid}/agreements/all")
        ->assertOk()->json('payload.data'));

    expect($rows)->toHaveCount(5)
        ->and($rows->pluck('posted_date')->filter())->toHaveCount(5);

    // The recipient lookup is one query for the page, not one per version.
    $withFive = $count;
    expect($withFive)->toBeLessThan(15);
});

/*
|--------------------------------------------------------------------------
| The default agreement template
|--------------------------------------------------------------------------
|
| One template for every client — the routes take no {guid}. Config ships the
| wording; an edit saves over it in the shared settings table; reset drops back.
|
*/

it('serves the shipped default title and content when nothing has been saved', function () {
    $s = agreementScenario() + ['test' => $this];

    Sanctum::actingAs($s['accountant']);
    $payload = $this->postJson('/payroll/agreements/default')->assertOk()->json('payload');

    expect($payload['title'])->toBe('Payroll Processing Terms and Conditions')
        ->and($payload['body'])->toContain('1. Services')
        ->and($payload['body'])->toContain('2. Responsibilities')
        ->and($payload['body'])->toContain('3. Confidentiality')
        ->and($payload['body'])->toContain('4. Fees')
        ->and($payload['body'])->toContain('5. Term and termination')
        // Nothing saved yet, so there is nothing to reset.
        ->and($payload['is_customised'])->toBeFalse();
});

it('saves an edited template and serves it to every firm afterwards', function () {
    $s = agreementScenario() + ['test' => $this];
    $otherFirm = makeFirm(['payment_type' => 'Weekly']);
    assignOrgRole($s['accountant'], $otherFirm, 'lead_acc');

    Sanctum::actingAs($s['accountant']);
    $this->postJson('/payroll/agreements/default/update', [
        'title' => 'Revised Payroll Terms',
        'body'  => 'Our revised standard wording.',
    ])->assertOk()->assertJsonPath('message', 'RECORD_UPDATED');

    $payload = $this->postJson('/payroll/agreements/default')->assertOk()->json('payload');

    expect($payload['title'])->toBe('Revised Payroll Terms')
        ->and($payload['body'])->toBe('Our revised standard wording.')
        ->and($payload['is_customised'])->toBeTrue()
        ->and($payload['updated_at'])->not->toBeNull();

    // Global: it is the same template no matter which client is being drafted
    // for, which is the whole reason these routes carry no firm guid.
    $this->postJson("/payroll/{$otherFirm->guid}/agreements/create", [
        'title' => $payload['title'],
        'body'  => $payload['body'],
    ])->assertOk();

    expect(Agreement::where('firm_id', $otherFirm->id)->latest('id')->first()->title)
        ->toBe('Revised Payroll Terms');

    // One global row per key, not one per edit.
    expect(AppSetting::where('context', 'payroll_agreement')->where('user_id', 0)->count())->toBe(2);
});

it('overwrites rather than stacking rows on a second edit, and resets to the shipped wording', function () {
    $s = agreementScenario() + ['test' => $this];

    Sanctum::actingAs($s['accountant']);
    $this->postJson('/payroll/agreements/default/update', ['title' => 'First', 'body' => 'One'])->assertOk();
    $this->postJson('/payroll/agreements/default/update', ['title' => 'Second', 'body' => 'Two'])->assertOk();

    expect(AppSetting::where('context', 'payroll_agreement')->where('user_id', 0)->count())->toBe(2)
        ->and($this->postJson('/payroll/agreements/default')->json('payload.title'))->toBe('Second');

    $payload = $this->postJson('/payroll/agreements/default/update', ['reset' => true])
        ->assertOk()->json('payload');

    expect($payload['title'])->toBe('Payroll Processing Terms and Conditions')
        ->and($payload['is_customised'])->toBeFalse()
        ->and(AppSetting::where('context', 'payroll_agreement')->count())->toBe(0);
});

it('requires both halves on a save, so the template is never half-edited', function () {
    $s = agreementScenario() + ['test' => $this];

    Sanctum::actingAs($s['accountant']);

    $this->postJson('/payroll/agreements/default/update', ['title' => 'Title only'])->assertStatus(422);
    $this->postJson('/payroll/agreements/default/update', ['body' => 'Body only'])->assertStatus(422);
    $this->postJson('/payroll/agreements/default/update', [])->assertStatus(422);

    expect(AppSetting::where('context', 'payroll_agreement')->count())->toBe(0);
});

it('leaves agreements already drafted untouched when the template changes', function () {
    $s = agreementScenario() + ['test' => $this];

    Sanctum::actingAs($s['accountant']);
    $template = $this->postJson('/payroll/agreements/default')->assertOk()->json('payload');

    $this->postJson("/payroll/{$s['firm']->guid}/agreements/create", [
        'title' => $template['title'],
        'body'  => $template['body'],
    ])->assertOk();

    $agreement = Agreement::where('firm_id', $s['firm']->id)->latest('id')->first();

    $this->postJson('/payroll/agreements/default/update', [
        'title' => 'Completely different',
        'body'  => 'Completely different wording.',
    ])->assertOk();

    // The agreement owns its copy from the moment it is created — this is what
    // stops a signed agreement being rewritten underneath the client.
    expect($agreement->fresh()->title)->toBe('Payroll Processing Terms and Conditions')
        ->and($agreement->fresh()->body)->toContain('1. Services');
});

it('posts the default template straight back to create', function () {
    $s = agreementScenario() + ['test' => $this];

    Sanctum::actingAs($s['accountant']);
    $template = $this->postJson('/payroll/agreements/default')->assertOk()->json('payload');

    // title/body come back under the keys create() takes.
    $this->postJson("/payroll/{$s['firm']->guid}/agreements/create", [
        'title' => $template['title'],
        'body'  => $template['body'],
    ])->assertOk();

    $agreement = Agreement::where('firm_id', $s['firm']->id)->latest('id')->first();

    expect($agreement->title)->toBe($template['title'])
        ->and($agreement->body)->toBe($template['body'])
        ->and($agreement->status)->toBe('Draft');

    // It has content, so it is immediately sendable.
    $this->postJson("/payroll/{$s['firm']->guid}/agreements/{$agreement->id}/send")->assertOk();
});

it('never applies the template on its own', function () {
    $s = agreementScenario() + ['test' => $this];

    Sanctum::actingAs($s['accountant']);
    $this->postJson('/payroll/agreements/default')->assertOk();

    // Fetching the template must not have created an agreement.
    expect(Agreement::where('firm_id', $s['firm']->id)->count())->toBe(0);

    // A create with no body stays genuinely empty rather than silently
    // inheriting the boilerplate — an empty draft must not be sendable.
    $this->postJson("/payroll/{$s['firm']->guid}/agreements/create", ['price' => 10])->assertOk();
    $agreement = Agreement::where('firm_id', $s['firm']->id)->latest('id')->first();

    expect($agreement->body)->toBeNull();

    $this->postJson("/payroll/{$s['firm']->guid}/agreements/{$agreement->id}/send")
        ->assertStatus(422)->assertJsonPath('message', 'AGREEMENT_CONTENT_REQUIRED');
});

it('closes the template to everyone who cannot raise an agreement', function () {
    $s = agreementScenario() + ['test' => $this];

    // The firm's own client.
    Sanctum::actingAs($s['client']);
    $this->postJson('/payroll/agreements/default')->assertStatus(403);
    $this->postJson('/payroll/agreements/default/update', ['title' => 'x', 'body' => 'y'])->assertStatus(403);

    // Staff cannot create agreements, so they cannot rewrite the template
    // every agreement starts from either.
    Sanctum::actingAs(makeUser('Staff'));
    $this->postJson('/payroll/agreements/default')->assertStatus(403);
    $this->postJson('/payroll/agreements/default/update', ['title' => 'x', 'body' => 'y'])->assertStatus(403);

    expect(AppSetting::where('context', 'payroll_agreement')->count())->toBe(0);
});
