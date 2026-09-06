<?php

use App\Modules\Clients\Models\Checklist;
use App\Modules\Clients\Models\Document;
use App\Modules\Files\Models\File;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\URL;

uses(RefreshDatabase::class);

beforeEach(fn () => seedAuthReferenceData());

/*
|--------------------------------------------------------------------------
| Files::stream — the Employee staff-bypass fix
|--------------------------------------------------------------------------
|
| $staffRoles used to include 'Employee', which meant holding that role
| short-circuited every per-file ownership check for every file in the system,
| in any firm. The payroll module makes that acute: under it, every employee at
| every client is an Employee-role account.
|
| These tests pin the corrected boundary. Note the route is NOT behind
| auth:sanctum — it sits on a signed URL and resolves the user itself from the
| `uid` query parameter, so Sanctum::actingAs alone would not exercise it.
| Every request here goes through a real signed URL.
|
*/

/** A signed stream URL for $fileId, acting as $userId — the shape store() mints. */
function streamUrl(int $fileId, int $userId): string
{
    return URL::temporarySignedRoute(
        'files.stream',
        now()->addMinutes(10),
        ['file_id' => $fileId, 'uid' => $userId]
    );
}

/**
 * A file uploaded by $uploader, attached to a checklist item owned by $firmId.
 *
 * File has a saving() hook that reads auth()->user()->id, so the uploader has
 * to be the acting user while the row is written. Auth is cleared immediately
 * afterwards, so the request under test resolves its user from the signed URL
 * rather than a lingering session — which is the path production uses.
 */
function checklistFile(int $firmId, \App\Models\User $uploader): File
{
    $uploaderId = $uploader->id;
    \Illuminate\Support\Facades\Auth::setUser($uploader);

    $file = File::create([
        'group'      => 'document',
        'file_name'  => 'payslip.pdf',
        'file_path'  => 'documents/test/payslip.pdf',
        'file_size'  => 1024,
        'file_type'  => 'application/pdf',
        'file_hash'  => 'hash' . random_int(100000, 999999),
        'created_by' => $uploaderId,
        'updated_by' => $uploaderId,
    ]);

    $checklist = Checklist::create([
        'firm_id' => $firmId,
        'name'    => 'Test checklist item',
        'code'    => 'CHK' . random_int(1000, 9999),
    ]);

    Document::create([
        'checklist_id' => $checklist->id,
        'file_id'      => $file->id,
        'uploaded_by'  => $uploaderId,
    ]);

    \Illuminate\Support\Facades\Auth::forgetUser();

    return $file;
}

/**
 * A recently-used personal access token is one of the two ways stream()
 * accepts a `uid`, and the one that does not depend on the session guard.
 */
function markRecentlyActive(int $userId): void
{
    DB::table('personal_access_tokens')->insert([
        'tokenable_type' => 'App\\Models\\User',
        'tokenable_id'   => $userId,
        'name'           => 'test',
        'token'          => hash('sha256', 'tok' . $userId . random_int(1, 999999)),
        'abilities'      => '["*"]',
        'last_used_at'   => now(),
        'created_at'     => now(),
        'updated_at'     => now(),
    ]);
}

/*
|--------------------------------------------------------------------------
| The regression itself
|--------------------------------------------------------------------------
*/

it('denies an Employee streaming a file belonging to another firm', function () {
    $ownFirm = makeFirm();
    $otherFirm = makeFirm();

    $employee = makeUser('Employee', ['firm_id' => $ownFirm->id]);
    markRecentlyActive($employee->id);

    // Uploaded by someone else, at a firm this employee has nothing to do with.
    $stranger = makeUser('Client', ['firm_id' => $otherFirm->id]);
    $file = checklistFile($otherFirm->id, $stranger);

    $this->get(streamUrl($file->id, $employee->id))->assertForbidden();
});

it('allows an Employee streaming a checklist file from their own firm', function () {
    $firm = makeFirm();

    $employee = makeUser('Employee', ['firm_id' => $firm->id]);
    markRecentlyActive($employee->id);

    // Uploaded by the client, not the employee — so this passes only through
    // the firm-ownership helper, not the created_by check.
    $client = makeUser('Client', ['firm_id' => $firm->id]);
    $file = checklistFile($firm->id, $client);

    // 404 rather than 200: the S3 object does not exist in tests. What matters
    // is that authorization passed — a denial would be 403 and never reach the
    // storage lookup.
    $this->get(streamUrl($file->id, $employee->id))->assertNotFound();
});

it('denies an Employee with no firm at all', function () {
    $otherFirm = makeFirm();

    $employee = makeUser('Employee');
    markRecentlyActive($employee->id);

    $stranger = makeUser('Client', ['firm_id' => $otherFirm->id]);
    $file = checklistFile($otherFirm->id, $stranger);

    $this->get(streamUrl($file->id, $employee->id))->assertForbidden();
});

/*
|--------------------------------------------------------------------------
| Boundaries the fix must not have moved
|--------------------------------------------------------------------------
*/

it('still allows real staff to stream any file', function () {
    $firm = makeFirm();

    $accountant = makeUser('Accountant');
    markRecentlyActive($accountant->id);

    $client = makeUser('Client', ['firm_id' => $firm->id]);
    $file = checklistFile($firm->id, $client);

    $this->get(streamUrl($file->id, $accountant->id))->assertNotFound();
});

it('still allows the uploader to stream their own file', function () {
    $firm = makeFirm();

    $client = makeUser('Client', ['firm_id' => $firm->id]);
    markRecentlyActive($client->id);

    $file = checklistFile($firm->id, $client);

    $this->get(streamUrl($file->id, $client->id))->assertNotFound();
});

it('still denies a Client streaming another firm file they did not upload', function () {
    $ownFirm = makeFirm();
    $otherFirm = makeFirm();

    $client = makeUser('Client', ['firm_id' => $ownFirm->id]);
    markRecentlyActive($client->id);

    $stranger = makeUser('Client', ['firm_id' => $otherFirm->id]);
    $file = checklistFile($otherFirm->id, $stranger);

    $this->get(streamUrl($file->id, $client->id))->assertForbidden();
});

it('rejects an unsigned url outright', function () {
    $firm = makeFirm();
    $client = makeUser('Client', ['firm_id' => $firm->id]);
    $file = checklistFile($firm->id, $client);

    $this->get("/files/{$file->id}/stream?uid={$client->id}")->assertForbidden();
});
