<?php

return [


    /*
    |--------------------------------------------------------------------------
    | User settings
    |--------------------------------------------------------------------------
    |
    */
    // Search and filter variables
    'filters' => [
        'results_per_page'     => 15,
        'page'                 => 1,
        'search'               => '',
        'order_by'             => 'created_at',
        'offset'               => 0,
    ],

    // Order by
    'order_by' =>  [
        'title_asc',
        'title_desc',
        'newest_first',
        'newest_last'
    ],

    'status' => [
        'inactive' => 0,
        'active' => 1,
        'pending' => 2,
        'archived' => 3,
    ],


];
