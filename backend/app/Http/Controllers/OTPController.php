<?php

namespace App\Http\Controllers;

use App\Http\Controllers\BaseController;
use Illuminate\Support\Facades\Config;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Hash;

use App\Modules\Users\Models\Otp;
use App\Mail\SendMail;
use App\Models\User;

class OTPController extends BaseController {

    /**
     * Generate otp
     * =================================================
     */
    public function generateOTP ($send_to="", $type=null, $mode=null) {

        $now=now();

        // Generate a random string to be used as a temporary otp
        $otp = mt_rand(100000, 999999);
        $hash = Hash::make($otp);

        $data = [
            'send_to' => $send_to,
            'otp' => $otp,
            'hash' => $hash,
            'type' => $type,
            'mode' => $mode,
            'valid_till' => $now->addMinutes (30),
        ];
        Otp::upsert ($data, ['send_to'], ['otp', 'hash', 'valid_till']);

        return $otp;
    }

    /**
     * Validate otp
     * =================================================
     */
    public function validateOTP ($send_to="", $otp="") {

        $otp_validated = Otp::where (['send_to'=>$send_to, 'otp'=>$otp])->first ();

        if ($otp_validated) {
            $hash = $otp_validated->hash;
            return $hash;
        } else {
            return null;
        }
    }

    /**
     * Validate otp hash
     * =================================================
     */
    public function validateOTPHash ($send_to="", $hash="") {

        $otp_validated = Otp::where (['send_to'=>$send_to, 'hash'=>$hash])->first ();

        if ($otp_validated) {
            return true;
        } else {
            return false;
        }
    }

    /**
     * Clean up otp
     * =================================================
     */
    public function otpCleanUp ($send_to="") {
        Otp::where (['send_to'=>$send_to])->forceDelete();
    }

    /**
     * Send mobile otp
     * =================================================
     */
    public function sendMobileOTP ($mobile="", $message="") {

        //$otp = $this->generateOTP ($mobile);

        return true;
    }

}
