<?php

return [
    'allowed_types' => [
        'image' => [
            'png', 'bmp', 'jpg', 'gif', 'jpeg', 'svg', 'webp'
        ],
        'audio' => [
            'mp3', 'mp4', 'mp5', 'wav', 'aac', 'ogg'
        ],
        'document' => [
            'doc', 'docx', 'txt', 'pdf', 'xls', 'xlsx', 'ppt', 'pptx', 'odt', 'ods', 'odp', 'rtf', 'csv', 'zip', 'rar', '7z', 'tar', 'gz'
        ],
    ],
    'upload_type' => [
        'question',
        'choice',
        'profile_picture',
        'favicon',
        'logo',
    ],
    'group_1' => [
        'question',
        'choice',
    ],
    'group_2' => [
        'userpics',
    ],
    'group_3' => [
        'favicon',
        'logo',
    ],
    'max_upload_size' => '500mb',
    'aws_root_path' =>env('AWS_ROOT_PATH','')
];
