<?php

namespace App\Mail;

use App\Modules\Settings\Controllers\Settings;


class SendMail {

    public $data;

    /**
     * Create a new message instance.
     */
    public function send($to="", $subject="", $template="", $msg=[], $from="noreply@developer1.website") {

        if (empty ($to)) {
            return;
        }

        $settings = new Settings();
        $getSettings = $settings->getSettings ('general', 1);
        $app_name = isset ($getSettings['app_name']) ? $getSettings['app_name'] : config ('app.name');

        $view = view ($template, $msg);

        if (empty ($subject)) {
            $subject = $app_name;
        }

        $encoding = "utf-8";
        $header = "Content-type: text/html; charset=".$encoding." \r\n";
        $header .= "From: ".$app_name." <".$from."> \r\n";
        $header .= "MIME-Version: 1.0 \r\n";

        $headers = [
            'From' => $from,
            'Reply-To' => $from,
            'Content-type' => 'text/html',
        ];
        mail ($to, $subject, $view, $headers);
    }

}
