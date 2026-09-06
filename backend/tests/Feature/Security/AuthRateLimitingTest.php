<?php

use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\Mail;

uses(RefreshDatabase::class);

beforeEach(fn () => seedAuthReferenceData());

/*
|--------------------------------------------------------------------------
| Login lockout — RateLimiter::hit() was never called anywhere in the real
| login flow (only in an unused, dead LoginRequest scaffold class), so the
| "lockout" never actually fired. Fixed this week; guard against regressing.
|--------------------------------------------------------------------------
*/

it('locks out login after 5 failed attempts for the same email+ip', function () {
    $user = makeUser('Client', ['email' => 'lockout-target@test.example']);
    // makeUser() hashes 'password' — use that as the known-good password.

    for ($i = 0; $i < 5; $i++) {
        $this->postJson('/auth/login', [
            'email' => 'lockout-target@test.example',
            'password' => 'wrong-password',
        ])->assertStatus(501); // BaseController::sendError default code
    }

    // 6th attempt — even with the CORRECT password — should now be throttled,
    // not evaluated as a real login attempt.
    $response = $this->postJson('/auth/login', [
        'email' => 'lockout-target@test.example',
        'password' => 'password',
    ]);

    $response->assertStatus(422);
    expect($response->json('errors.email.0'))->toContain('Too many');
});

it('does not lock out a different email after another email failed 5 times', function () {
    makeUser('Client', ['email' => 'victim@test.example']);

    for ($i = 0; $i < 5; $i++) {
        $this->postJson('/auth/login', [
            'email' => 'attacker-target@test.example',
            'password' => 'wrong-password',
        ]);
    }

    $response = $this->postJson('/auth/login', [
        'email' => 'victim@test.example',
        'password' => 'wrong-password',
    ]);

    // Still a normal (non-throttled) invalid-credentials response.
    $response->assertStatus(501);
});

/*
|--------------------------------------------------------------------------
| OTP not leaked in the response body
|--------------------------------------------------------------------------
*/

it('never returns the OTP value from the OTP-request endpoint', function () {
    Mail::fake();
    makeUser('Client', ['email' => 'otp-target@test.example']);

    $response = $this->postJson('/auth/login/email_otp', [
        'email' => 'otp-target@test.example',
    ]);

    $response->assertOk();

    $payload = json_encode($response->json());
    // The OTP is a 6-digit number (100000-999999) — the response should
    // contain no numeric payload of that shape at all.
    expect((bool) preg_match('/"payload":\s*(\d{6}|"\d{6}")/', $payload))->toBeFalse();
    expect($response->json('payload'))->toBeEmpty();
});

/*
|--------------------------------------------------------------------------
| OTP validation rate limiting — previously unthrottled entirely, making the
| 6-digit code brute-forceable.
|--------------------------------------------------------------------------
*/

it('locks out OTP validation after 5 wrong guesses for the same email+ip', function () {
    Mail::fake();
    makeUser('Client', ['email' => 'otp-guess@test.example']);

    for ($i = 0; $i < 5; $i++) {
        $this->postJson('/auth/login/validate_otp', [
            'email' => 'otp-guess@test.example',
            'email_otp' => '000000',
        ]);
    }

    $response = $this->postJson('/auth/login/validate_otp', [
        'email' => 'otp-guess@test.example',
        'email_otp' => '000000',
    ]);

    $response->assertStatus(422);
    expect($response->json('errors.otp.0'))->toContain('Too many');
});

it('locks out OTP requests after 5 requests for the same email+ip', function () {
    Mail::fake();
    makeUser('Client', ['email' => 'otp-spam@test.example']);

    for ($i = 0; $i < 5; $i++) {
        $this->postJson('/auth/login/email_otp', ['email' => 'otp-spam@test.example']);
    }

    $response = $this->postJson('/auth/login/email_otp', ['email' => 'otp-spam@test.example']);

    $response->assertStatus(422);
    expect($response->json('errors.otp.0'))->toContain('Too many');
});
