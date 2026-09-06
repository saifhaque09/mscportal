<?php

namespace App\Helpers;

use Illuminate\Support\Str;
use Illuminate\Support\Facades\Config;
use Illuminate\Support\Facades\DB;

class Guid {

    /**
     * Generate a random, unguessable identifier and write it to the given
     * table/column for the row with this id.
     *
     * Previously derived from $title (first 3 letters, slugified) + $id —
     * e.g. "John" with id 42 produced "JOH42". That's a predictable value,
     * not a real access-control token: anyone who knows/guesses a record's
     * approximate name and a small integer could construct it directly.
     * $title/$id are kept in the signature only so existing call sites don't
     * need to change; $title is no longer used to derive the value.
     */
    public static function generate (string $table_name='', string $field_name='', string $title='', int $id=0) {
        do {
            $guid = Str::upper(Str::random(10));
        } while (DB::table($table_name)->where($field_name, $guid)->exists());

        DB::table($table_name)->where('id', $id)->update([$field_name => $guid]);

        return $guid;
    }
}