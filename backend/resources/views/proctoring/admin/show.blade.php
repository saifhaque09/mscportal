<h3>Alert #{{ $alert->id }}</h3>
<p><strong>Reason:</strong> {{ $alert->reason }}</p>
<p><strong>Exam:</strong> {{ $alert->exam_id }} — <strong>User:</strong> {{ $alert->user_id }}</p>
@if($alert->thumbnail)
  <img src="{{ asset('storage/'.$alert->thumbnail) }}" style="max-width:320px;border:1px solid #ccc" />
@endif

<h4>Clips</h4>
@foreach($alert->files as $f)
  <div style="margin-bottom:12px">
    <video width="480" controls>
      <source src="{{ asset('storage/'.$f->path) }}" type="video/webm">
      Your browser doesn't support video.
    </video>
    <div>File: {{ $f->path }}</div>
  </div>
@endforeach

<form method="POST" action="{{ url('/admin/proctor/alerts/'.$alert->id.'/merge') }}">
  @csrf
  <button class="btn">Merge clips (FFmpeg)</button>
</form>
