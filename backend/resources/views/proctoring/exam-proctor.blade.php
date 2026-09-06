<!doctype html>
<html>
<head>
  <meta charset="utf-8" />
  <title>Exam Proctoring</title>
  <style>
    body{font-family:system-ui,Segoe UI,Roboto,Arial;margin:16px}
    #video{border:1px solid #ddd;width:480px;height:360px;background:#000}
    #status{margin-top:8px;font-weight:600}
    .alerts{margin-top:12px}
    .btn{display:inline-block;padding:6px 10px;border-radius:6px;border:1px solid #444;background:#f5f5f5;cursor:pointer}
  </style>
</head>
<body>

<h2>Exam — Proctoring Enabled</h2>

<video id="video" autoplay muted playsinline></video>
<div id="status">Initializing...</div>
<div style="margin-top:8px">
  <button id="consentBtn" class="btn">I Consent & Start Exam</button>
  <span id="consentNote" style="margin-left:12px;color:#666"></span>
</div>

<div class="alerts" id="alertsLog"></div>

<script src="{{ asset('js/exam-proctor.js') }}"></script>
<script>
  // pass server-side variables to JS
  window.PROCTOR_CONFIG = {
    examId: "{{ $examId }}",
    userId: "{{ $userId }}",
    uploadEndpoint: "{{ url('/api/proctor/upload') }}",
    alertEndpoint: "{{ url('/api/proctor/alert') }}"
  };
</script>
</body>
</html>
