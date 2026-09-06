<x-email>
        <p>Dear @if ($name) {{ $name }} @else user @endif,</p>
        <p>You have been invited to join {{ config ('app.name')}} as <strong>{{ $role }}</strong> role. Please <a href="{{ $join_link }}">click here to join</a> </p>
        <p>If the link doesn't work, please copy and paste the following URL into your web browser:</p>
        <p>{{ $join_link }}</p>
</x-email>
