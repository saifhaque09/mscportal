<h3>Proctor Alerts</h3>
<table class="table">
  <thead><tr><th>ID</th><th>Exam</th><th>User</th><th>Reason</th><th>Time</th><th>Action</th></tr></thead>
  <tbody>
    @foreach($alerts as $a)
    <tr>
      <td>{{ $a->id }}</td>
      <td>{{ $a->exam_id }}</td>
      <td>{{ $a->user_id }}</td>
      <td>{{ $a->reason }}</td>
      <td>{{ $a->timestamp }}</td>
      <td><a href="{{ url('/admin/proctor/alerts/'.$a->id) }}">View</a></td>
    </tr>
    @endforeach
  </tbody>
</table>
{{ $alerts->links() }}
