<?php

return [

    // Search and filter defaults
    'filters' => [
        'results_per_page' => 15,
        'page'             => 1,
        'search'           => '',
        'order_by'         => 'newest_first',
        'offset'           => 0,
    ],

    // Order by. oldest_first/oldest_last are accepted as synonyms for
    // newest_last/newest_first respectively (see ActivityLogs::paginate()).
    'order_by' => [
        'newest_first',
        'newest_last',
        'oldest_first',
        'oldest_last',
    ],

];
