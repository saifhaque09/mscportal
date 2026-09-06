<html>
    <head>
        <title>{{ $title ?? 'Todo Manager' }}</title>
    </head>
    <body>
        <div style="font-family: Arial, sans-serif; line-height: 1.6;">

            <p>Dear {{ $name }},</p>

            <p>Your OTP for registration is <strong>{{ $otp }}</strong> valid for 30 minutes.</p>

            Thanks,<br>
            {{ config('app.name') }}
        </div>
    </body>
</html>
    <p>If you did not request this, please ignore this email.</p>

