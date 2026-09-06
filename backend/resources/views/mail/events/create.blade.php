<x-email>
        <p>Dear {{ $firm_name }},</p>
        <p>A new event <strong>{{ $event_name }}</strong> has been scheduled for you on {{ $date }} from {{ $from_time }} to {{ $to_time }}.</p>
        @if ($description)
        <p>{{ $description }}</p>
        @endif
</x-email>
