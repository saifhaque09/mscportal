<html>
    <body>
        <p>Dear {{ $name }},</p>
        <p> Your OTP for login is {{ $otp }} valid for 30 minutes </p>
        <p>Team {{ config ('app.name')}}</p>
    </body>
</html>
