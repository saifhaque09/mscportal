<?php

return [


    /*
    |--------------------------------------------------------------------------
    | User settings
    |--------------------------------------------------------------------------
    |
    */

    'default' => [
        'role' => 'Accountant',
        'status' => 1
    ],
    'status' => [
        'inactive' => 0,
        'active' => 1,
        'pending' => 2,
        'archived' => 3,
    ],
    'roles' => ['Accountant', 'Staff'],
    
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
    
    /*
    |--------------------------------------------------------------------------
    | ACLs
    |--------------------------------------------------------------------------
    |
    */

    'acl' => [
        'Owner' =>
            [
                ['path' => '/dashboard','group' => 'web','category' => 'acl','title' => 'Dashboard','icon' => 'ri-home-smile-line','options' => '','parent_id' => NULL],
                ['path' => '#test','group' => 'web','category' => 'acl','title' => 'Test','icon' => 'ri-clipboard-line','options' => '','parent_id' => NULL, 'children'=>
                    [
                        ['path' => '/tests/categories','group' => 'web','category' => 'acl','title' => 'Test Categories','icon' => '','options' => '','parent_id' => NULL],
                        ['path' => '/tests/list','group' => 'web','category' => 'acl','title' => 'All Tests','icon' => '','options' => '','parent_id' => NULL],
                        ['path' => '/tests/add','group' => 'web','category' => 'acl','title' => 'Add Test','icon' => '','options' => '','parent_id' => NULL]
                    ]
                ],
                ['path' => '#users','group' => 'web','category' => 'acl','title' => 'Users','icon' => 'ri-user-line','options' => '','parent_id' => NULL, 'children'=>
                    [
                        ['path' => '/users/list','group' => 'web','category' => 'acl','title' => 'All Users','icon' => '','options' => '','parent_id' => NULL],
                        ['path' => '/users/batches','group' => 'web','category' => 'acl','title' => 'Batches','icon' => 'ri-file-list-line','options' => '','parent_id' => NULL],
                    ]
                ],
                ['path' => '#qb','group' => 'web','category' => 'acl','title' => 'Question Bank','icon' => 'ri-book-2-line','options' => '','parent_id' => NULL, 'children'=>
                    [
                        ['path' => '/questions/list','group' => 'web','category' => 'acl','title' => 'All Question','icon' => 'ri-book-2-line','options' => '','parent_id' => NULL],
                        ['path' => '/questions/categories','group' => 'web','category' => 'acl','title' => 'Categories','icon' => '','options' => '','parent_id' => NULL],
                    ]
                ],
            ],
        'Admin' =>
            [
                ['path' => '/dashboard','group' => 'web','category' => 'acl','title' => 'Dashboard','icon' => 'ri-home-smile-line','options' => '','parent_id' => NULL],
                ['path' => '#test','group' => 'web','category' => 'acl','title' => 'Test','icon' => 'ri-clipboard-line','options' => '','parent_id' => NULL, 'children'=>
                    [
                        ['path' => '/tests/categories','group' => 'web','category' => 'acl','title' => 'Test Categories','icon' => '','options' => '','parent_id' => NULL],
                        ['path' => '/tests/list','group' => 'web','category' => 'acl','title' => 'All Tests','icon' => '','options' => '','parent_id' => NULL],
                        ['path' => '/tests/add','group' => 'web','category' => 'acl','title' => 'Add Test','icon' => '','options' => '','parent_id' => NULL]
                    ]
                ],
                ['path' => '#users','group' => 'web','category' => 'acl','title' => 'Users','icon' => 'ri-user-line','options' => '','parent_id' => NULL, 'children'=>
                    [
                        ['path' => '/users/list','group' => 'web','category' => 'acl','title' => 'All Users','icon' => '','options' => '','parent_id' => NULL],
                        ['path' => '/users/batches','group' => 'web','category' => 'acl','title' => 'Batches','icon' => 'ri-file-list-line','options' => '','parent_id' => NULL],
                    ]
                ],
                ['path' => '#qb','group' => 'web','category' => 'acl','title' => 'Question Bank','icon' => 'ri-book-2-line','options' => '','parent_id' => NULL, 'children'=>
                    [
                        ['path' => '/questions/list','group' => 'web','category' => 'acl','title' => 'All Question','icon' => 'ri-book-2-line','options' => '','parent_id' => NULL],
                        ['path' => '/questions/categories','group' => 'web','category' => 'acl','title' => 'Categories','icon' => '','options' => '','parent_id' => NULL],
                    ]
                ],
            ],

            'Instructor' =>
            [
                ['path' => '/dashboard','group' => 'web','category' => 'acl','title' => 'Dashboard','icon' => 'ri-home-smile-line','options' => '','parent_id' => NULL],
                ['path' => '#test','group' => 'web','category' => 'acl','title' => 'Test','icon' => 'ri-clipboard-line','options' => '','parent_id' => NULL, 'children'=>
                    [
                        ['path' => '/tests/categories','group' => 'web','category' => 'acl','title' => 'Test Categories','icon' => '','options' => '','parent_id' => NULL],
                        ['path' => '/tests/list','group' => 'web','category' => 'acl','title' => 'All Tests','icon' => '','options' => '','parent_id' => NULL],
                        ['path' => '/tests/add','group' => 'web','category' => 'acl','title' => 'Add Test','icon' => '','options' => '','parent_id' => NULL]
                    ]
                ],
                ['path' => '#users','group' => 'web','category' => 'acl','title' => 'Users','icon' => 'ri-user-line','options' => '','parent_id' => NULL, 'children'=>
                    [
                        ['path' => '/users/list','group' => 'web','category' => 'acl','title' => 'All Users','icon' => '','options' => '','parent_id' => NULL],
                        ['path' => '/users/batches','group' => 'web','category' => 'acl','title' => 'Batches','icon' => 'ri-file-list-line','options' => '','parent_id' => NULL],
                    ]
                ],
                ['path' => '#qb','group' => 'web','category' => 'acl','title' => 'Question Bank','icon' => 'ri-book-2-line','options' => '','parent_id' => NULL, 'children'=>
                    [
                        ['path' => '/questions/list','group' => 'web','category' => 'acl','title' => 'All Question','icon' => 'ri-book-2-line','options' => '','parent_id' => NULL],
                        ['path' => '/questions/categories','group' => 'web','category' => 'acl','title' => 'Categories','icon' => '','options' => '','parent_id' => NULL],
                    ]
                ],
            ],
            'Learner' =>
            [
                ['path' => '/dashboard','group' => 'web','category' => 'acl','title' => 'Dashboard','icon' => 'ri-home-smile-line','options' => '','parent_id' => NULL],
                ['path' => '#test','group' => 'web','category' => 'acl','title' => 'Test','icon' => 'ri-clipboard-line','options' => '','parent_id' => NULL, 'children'=>
                    [
                        ['path' => '/tests/my-test','group' => 'web','category' => 'acl','title' => 'My Test','icon' => 'ri-file-list-line','options' => '','parent_id' => NULL],
                        ['path' => '/tests/myreport','group' => 'web','category' => 'url','title' => 'My Report','icon' => '','options' => '','parent_id' => NULL],
                    ],
                ],
            ],
    ]

];
