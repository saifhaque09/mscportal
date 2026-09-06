<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <title>Exam Proctoring</title>
    <meta name="viewport" content="width=device-width, initial-scale=1.0">

    <style>
        body {
            font-family: Arial, sans-serif;
            background: #f5f6fa;
            margin: 0;
            padding: 0;
        }

        #container {
            max-width: 900px;
            margin: 20px auto;
            background: white;
            padding: 20px;
            border-radius: 10px;
            box-shadow: 0 3px 10px rgba(0, 0, 0, 0.1);
        }

        #videoFeed {
            width: 100%;
            background: black;
            border-radius: 10px;
        }

        #statusBox {
            margin-top: 20px;
            padding: 15px;
            background: #eef2ff;
            border-radius: 10px;
            font-size: 16px;
        }

        #alerts {
            margin-top: 20px;
            padding: 15px;
            background: #fff4e5;
            border-radius: 10px;
            font-size: 15px;
            min-height: 40px;
        }

        #scoreBox {
            margin-top: 20px;
            padding: 15px;
            background: #e8ffe5;
            border-radius: 10px;
            font-size: 18px;
            font-weight: bold;
        }

        .alert-item {
            margin-bottom: 8px;
            padding: 8px;
            background: #fff9c4;
            border-left: 4px solid orange;
        }
    </style>
</head>
<body>

<div id="container">

    <h2>Exam AI Proctoring</h2>

    <video id="videoFeed" autoplay playsinline></video>

    <div id="statusBox">
        ✅ Camera & microphone connected.
        AI Proctoring is now monitoring in real-time.
    </div>

    <div id="alerts">
        <strong>Proctor Alerts will appear here...</strong>
    </div>

    <div id="scoreBox">
        Suspicion Score: <span id="suspicionScore">0</span>/100
    </div>

</div>

<!-- Pass exam & user IDs to JS -->
<script>
    window.PROCTOR_CONFIG = {
        uploadEndpoint: "{{ route('proctor.upload') }}",
        alertEndpoint: "{{ route('proctor.alert') }}"
    };
    window.EXAM_ID = "{{ $exam_id ?? 1 }}";
    window.USER_ID = "{{ $user_id ?? 1 }}";
</script>

<!-- Load external proctor engine -->
<script src="{{ config('app_url') }}/js/proctor.js?v=1.0"></script>

</body>
</html>
