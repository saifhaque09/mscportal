<x-email>

    <div style="font-family: Arial, sans-serif; line-height: 1.6;">

        <p>Dear {{ $name }},</p>

        <p>Your OTP for registration is <strong>{{ $otp }}</strong> valid for {{ $validity}}.</p>

    </div>

</x-email>
