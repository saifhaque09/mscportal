<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Crypt;
use Illuminate\Contracts\Encryption\DecryptException;

/**
 * The User model's `meta` column (SIN, DOB, marital/spouse details, banking
 * info) switched from a plain `array` cast to `encrypted:array`. That only
 * changes how the app reads/writes the column going forward — any row
 * written before this change still holds plaintext JSON, and the new cast
 * would throw a DecryptException trying to read it. This is a one-time data
 * migration to encrypt whatever is already there.
 *
 * Idempotent: for each row, try to decrypt it first — if that succeeds, the
 * row is already encrypted (e.g. this migration re-ran, or the row was
 * written after the model change) and is left alone.
 */
return new class extends Migration
{
    public function up(): void
    {
        DB::table('users')->whereNotNull('meta')->where('meta', '!=', '')
            ->orderBy('id')
            ->chunkById(200, function ($rows) {
                foreach ($rows as $row) {
                    try {
                        Crypt::decryptString($row->meta);
                        continue; // already encrypted
                    } catch (DecryptException $e) {
                        // plaintext JSON — encrypt it in place
                    }

                    DB::table('users')->where('id', $row->id)->update([
                        'meta' => Crypt::encryptString($row->meta),
                    ]);
                }
            });
    }

    public function down(): void
    {
        DB::table('users')->whereNotNull('meta')->where('meta', '!=', '')
            ->orderBy('id')
            ->chunkById(200, function ($rows) {
                foreach ($rows as $row) {
                    try {
                        $plain = Crypt::decryptString($row->meta);
                    } catch (DecryptException $e) {
                        continue; // already plaintext (or foreign ciphertext) — leave as-is
                    }

                    DB::table('users')->where('id', $row->id)->update([
                        'meta' => $plain,
                    ]);
                }
            });
    }
};
