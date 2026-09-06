<x-email>
Dear {{ $name }}

Your account as <strong>{{ $role }}</strong> has been successfully created in {{ config('app.name') }}. Your user id is <strong>{{ $guid }}</strong>.
@if ($status === 1)
    Your account is currently <strong>{{ $status }}</strong>. You can now log in using your email and password.
@elseif ($status === 2)
    Your account is currently <strong> waiting for admin approval</strong>. Please wait for admin approval before you can log in. You will be informed through email once your account is activated.
@endif

</x-email>
