<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Support\Facades\DB;

/**
 * users.meta and invites.meta are cast as `encrypted:array` on their models.
 * The prior data migration (2026_07_06_000001_encrypt_existing_user_meta)
 * only encrypted rows where meta was non-empty plaintext JSON, explicitly
 * skipping rows where meta is a literal empty string. Under the encrypted
 * cast, NULL is safe (short-circuited before decryption) but '' is not —
 * decrypting '' throws DecryptException("The payload is invalid."), which
 * broke login for any taxfiler whose meta was ''. This normalizes those
 * rows to NULL, which the cast already treats as "no meta".
 */
return new class extends Migration
{
    public function up(): void
    {
        DB::table('users')->where('meta', '')->update(['meta' => null]);
        DB::table('invites')->where('meta', '')->update(['meta' => null]);
    }

    public function down(): void
    {
        // Not reversible — original empty-string values weren't preserved.
    }
};
