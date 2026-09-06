<?php

use App\Services\PayrollPeriodService;
use Illuminate\Support\Carbon;

/*
|--------------------------------------------------------------------------
| PayrollPeriodService — pure date arithmetic, no database
|--------------------------------------------------------------------------
|
| The month-based frequencies are the reason this file exists. Anchoring on the
| 31st and repeatedly calling addMonth() drifts (Jan 31 -> Feb 28 -> Mar 28 ->
| ...), which would silently shift every subsequent pay period. The service
| works from startOfMonth instead; these tests are what hold it to that.
|
*/

function svc(): PayrollPeriodService
{
    return new PayrollPeriodService();
}

function periods(string $frequency, string $anchor, int $count, int $payOffset = 0, int $cutoff = 0): array
{
    return svc()->periodsFor($frequency, Carbon::parse($anchor), $count, $payOffset, $cutoff);
}

/*
| Weekly / Bi-Weekly — fixed-length blocks
*/

it('generates contiguous weekly periods of exactly 7 days', function () {
    $p = periods('Weekly', '2026-01-05', 4);

    expect($p[0]['period_start'])->toBe('2026-01-05')
        ->and($p[0]['period_end'])->toBe('2026-01-11')
        ->and($p[1]['period_start'])->toBe('2026-01-12')
        ->and($p[3]['period_end'])->toBe('2026-02-01');
});

it('generates contiguous bi-weekly periods of exactly 14 days', function () {
    $p = periods('Bi-Weekly', '2026-01-05', 3);

    expect($p[0]['period_start'])->toBe('2026-01-05')
        ->and($p[0]['period_end'])->toBe('2026-01-18')
        ->and($p[1]['period_start'])->toBe('2026-01-19')
        ->and($p[1]['period_end'])->toBe('2026-02-01')
        ->and($p[2]['period_end'])->toBe('2026-02-15');
});

it('leaves no gap or overlap between consecutive periods', function () {
    foreach (['Weekly', 'Bi-Weekly', 'Semi-Monthly', 'Monthly', 'Bi-Monthly', 'Quarterly'] as $frequency) {
        $p = periods($frequency, '2026-01-01', 8);

        for ($i = 1; $i < count($p); $i++) {
            $previousEnd = Carbon::parse($p[$i - 1]['period_end']);
            $thisStart = Carbon::parse($p[$i]['period_start']);

            expect($thisStart->toDateString())
                ->toBe($previousEnd->copy()->addDay()->toDateString(), "gap or overlap in {$frequency} at index {$i}");
        }
    }
});

/*
| Month-based — the drift cases
*/

it('does not drift when the anchor is the 31st', function () {
    // The regression this guards: addMonth() on Jan 31 yields Feb 28, and the
    // next addMonth() then yields Mar 28 rather than Mar 31.
    $p = periods('Monthly', '2026-01-31', 4);

    expect($p[0]['period_end'])->toBe('2026-01-31')
        ->and($p[1]['period_end'])->toBe('2026-02-28')
        ->and($p[2]['period_end'])->toBe('2026-03-31')
        ->and($p[3]['period_end'])->toBe('2026-04-30');
});

it('handles February in a leap year', function () {
    $p = periods('Monthly', '2028-01-01', 3);

    expect($p[1]['period_start'])->toBe('2028-02-01')
        ->and($p[1]['period_end'])->toBe('2028-02-29');
});

it('rolls monthly periods across a year boundary', function () {
    $p = periods('Monthly', '2026-11-01', 3);

    expect($p[0]['period_end'])->toBe('2026-11-30')
        ->and($p[1]['period_end'])->toBe('2026-12-31')
        ->and($p[2]['period_start'])->toBe('2027-01-01')
        ->and($p[2]['period_end'])->toBe('2027-01-31');
});

it('splits semi-monthly periods at the 15th and month end', function () {
    $p = periods('Semi-Monthly', '2026-01-01', 4);

    expect($p[0]['period_start'])->toBe('2026-01-01')
        ->and($p[0]['period_end'])->toBe('2026-01-15')
        ->and($p[1]['period_start'])->toBe('2026-01-16')
        ->and($p[1]['period_end'])->toBe('2026-01-31')
        ->and($p[2]['period_start'])->toBe('2026-02-01')
        ->and($p[2]['period_end'])->toBe('2026-02-15');
});

it('generates two-month bi-monthly periods aligned to the anchor month', function () {
    $p = periods('Bi-Monthly', '2026-01-01', 3);

    expect($p[0]['period_end'])->toBe('2026-02-28')
        ->and($p[1]['period_start'])->toBe('2026-03-01')
        ->and($p[1]['period_end'])->toBe('2026-04-30')
        ->and($p[2]['period_end'])->toBe('2026-06-30');
});

it('aligns quarterly periods to the anchor rather than the calendar quarter', function () {
    // Anchored in February, so quarters run Feb-Apr, not Jan-Mar. Copying
    // OrganizationDeadlineService's endOfQuarter() would ignore the anchor.
    $p = periods('Quarterly', '2026-02-01', 2);

    expect($p[0]['period_start'])->toBe('2026-02-01')
        ->and($p[0]['period_end'])->toBe('2026-04-30')
        ->and($p[1]['period_start'])->toBe('2026-05-01')
        ->and($p[1]['period_end'])->toBe('2026-07-31');
});

it('generates annual periods that end the day before the anniversary', function () {
    $p = periods('Annual', '2026-01-01', 2);

    expect($p[0]['period_end'])->toBe('2026-12-31')
        ->and($p[1]['period_start'])->toBe('2027-01-01')
        ->and($p[1]['period_end'])->toBe('2027-12-31');
});

/*
| Pay date and cutoff
*/

it('offsets the pay date from the period end and the cutoff from the pay date', function () {
    $p = periods('Bi-Weekly', '2026-01-05', 1, payOffset: 4, cutoff: 2);

    expect($p[0]['period_end'])->toBe('2026-01-18')
        ->and($p[0]['pay_date'])->toBe('2026-01-22')
        ->and($p[0]['cutoff_date'])->toBe('2026-01-20');
});

it('pays on the period end date when the offset is zero', function () {
    $p = periods('Weekly', '2026-03-02', 1);

    expect($p[0]['period_end'])->toBe('2026-03-08')
        ->and($p[0]['pay_date'])->toBe('2026-03-08');
});

it('carries the pay date into the next month when the offset crosses month end', function () {
    $p = periods('Monthly', '2026-01-01', 1, payOffset: 5);

    expect($p[0]['period_end'])->toBe('2026-01-31')
        ->and($p[0]['pay_date'])->toBe('2026-02-05');
});

it('returns exactly the number of periods asked for', function () {
    expect(periods('Weekly', '2026-01-01', 52))->toHaveCount(52)
        ->and(periods('Bi-Weekly', '2026-01-01', 26))->toHaveCount(26)
        ->and(periods('Monthly', '2026-01-01', 12))->toHaveCount(12);
});
