<?php

namespace App\Modules\Clients\Controllers;

use Illuminate\Http\Request;
use Illuminate\Validation\Rule;
use Illuminate\Support\Facades\Config;
use Illuminate\Support\Facades\Mail;
use Illuminate\Support\Str;
use Validator;

use App\Http\Controllers\BaseController;
use App\Modules\Clients\Models\Firm;
use App\Modules\Clients\Models\Checklist;
use App\Modules\ActivityLogs\Models\ActivityLog;
use App\Modules\Notifications\Models\Notification;
use App\Models\User;
use App\Helpers\Guid;


class Checklists extends BaseController {

    /**
     * Create new checklist item
     *
     */
    public function create (Request $request, string $guid='') {

        $firm_id = NULL;
        $firm = Firm::where('guid', $guid)->first();
        if ( $firm) {
            $firm_id = $firm->id;
            // return $this->sendError ("BUSINESS_NOT_FOUND");
        }

        // Global/default templates (no firm resolved) stay staff-only via the
        // plain Spatie permission; firm-scoped checklists additionally need
        // an org-role assignment on this specific firm granting manage_checklist.
        $authorized = $firm
            ? $this->authorizeFirmManageAction($firm->id, 'checklists.manage', 'manage_checklist')
            : auth()->user()->can('checklists.manage');
        if (! $authorized) {
            return $this->sendError('UNAUTHORIZED', 403);
        }

        $rules = [
            'name' => ['required', 'string', 'max:150'],
            'year' => ['nullable', 'numeric', 'digits:4'],
            'month' => ['nullable', 'numeric', 'digits:2'],
            'is_required' => ['nullable', 'boolean'],
            'details' => ['nullable', 'string', 'max:255'],
            'category' => ['nullable', 'numeric', 'exists:checklist_items,id'],
        ];

        $validator = Validator::make($request->all(), $rules);
        if ($validator->fails()) {
            return $this->sendError ($validator->errors());
        } else {

            // Retrieve the validated input...
            $validated = $validator->validated();

            $data = [
                'firm_id' => $firm_id,
                'name' => $validated['name'],
                'year' => isset($validated['year']) ? $validated['year'] : date('Y'),
                'month' => isset($validated['month']) ? $validated['month'] : date('m'),
                'is_required' => isset($validated['is_required']) ? $validated['is_required'] : 0,
                'details' => isset($validated['details']) ? $validated['details'] : NULL,
                'category' => isset($validated['category']) ? $validated['category'] : NULL,
            ];

            $checklist = Checklist::create($data);
            Guid::generate ('checklist_items', 'code', $checklist->name, $checklist->id);

            $checklist = $checklist->fresh();

            ActivityLog::record('firms', "added default checklist {$checklist->name}", null, auth()->id());

            if (! empty($checklist->category) && $checklist->firm_id) {
                $this->notifySubcategoryAdded($checklist);
            }

            if ($checklist->firm_id && $checklist->is_required && $checklist->files()->count() === 0) {
                $this->notifyDocumentRequired($checklist);
            }

            return $this->sendResponse ('RECORD_CREATED', $checklist);
        }
    }

    /**
     * Notify the firm's Client user(s) when a subcategory (a checklist item
     * created under a parent via `category`) is added to their checklist.
     */
    private function notifySubcategoryAdded(Checklist $checklist): void
    {
        $clients = User::where('firm_id', $checklist->firm_id)->role('Client')->get();

        foreach ($clients as $client) {
            Notification::record(
                $client->id,
                'Checklist subcategory added',
                "A new checklist item \"{$checklist->name}\" has been added to your checklist.",
                'checklist_subcategory_added',
                auth()->id()
            );
        }
    }

    /**
     * Notify the firm's Client user(s) when a required checklist item is
     * created with no document uploaded against it yet, so they know a
     * document is expected. Fires for both parent and subcategory items.
     */
    private function notifyDocumentRequired(Checklist $checklist): void
    {
        $clients = User::where('firm_id', $checklist->firm_id)->role('Client')->get();

        foreach ($clients as $client) {
            Notification::record(
                $client->id,
                'Document required',
                "The checklist item \"{$checklist->name}\" requires a document to be uploaded.",
                'checklist_document_required',
                auth()->id()
            );
        }
    }

    /**
     * Edit business
     *
     */
    public function edit (Request $request, string $guid='', string $code='') {

        $firm_id = NULL;
        $firm = Firm::where('guid', $guid)->first();
        if ( $firm) {
            $firm_id = $firm->id;
            // return $this->sendError ("BUSINESS_NOT_FOUND");
        }

        $authorized = $firm
            ? $this->authorizeFirmManageAction($firm->id, 'checklists.manage', 'manage_checklist')
            : auth()->user()->can('checklists.manage');
        if (! $authorized) {
            return $this->sendError('UNAUTHORIZED', 403);
        }

        $checklist = Checklist::where (['code' => $code, 'firm_id' => $firm_id])->first();

        if (! $checklist) {
            return $this->sendError ('CHECKLIST_NOT_FOUND');
        }

        $rules = [
            'name' => ['nullable', 'string', 'max:255'],
            'year' => ['nullable', 'numeric', 'digits:4'],
            'month' => ['nullable', 'numeric', 'between:1,12'],
            'is_required' => ['nullable', 'boolean'],
            'details' => ['nullable', 'string', 'max:255'],
            'category' => ['nullable', 'integer'],
        ];
        $month = $request->input('month');

        // Normalize EVERYTHING
        if (is_string($month)) {
            $month = trim($month);
        }

        if ($month === '' || $month === 'null') {
            $month = null;
        }

        $request->merge([
            'month' => $month,
        ]);
        $validator = Validator::make($request->all(), $rules);
        if ($validator->fails()) {
            return $this->sendError ($validator->errors());
        } else {
               
            // Retrieve the validated input...
            $validated = $validator->validated();

                $data = [
            'name' => array_key_exists('name', $validated) ? $validated['name'] : $checklist->name,                      // CHANGED: was isset()
            'is_required' => array_key_exists('is_required', $validated) ? $validated['is_required'] : $checklist->is_required,  // CHANGED: was isset()
            'details' => array_key_exists('details', $validated) ? $validated['details'] : $checklist->details,          // CHANGED: was isset()
            'category' => array_key_exists('category', $validated) ? $validated['category'] : $checklist->category,      // CHANGED: was isset()
            'year' => array_key_exists('year', $validated) ? $validated['year'] : $checklist->year,                      // CHANGED: was isset()
            'month' => array_key_exists('month', $validated) ? $validated['month'] : $checklist->month,                  // CHANGED: was isset()
        ];

            $checklist->update($data);
            $checklist = $checklist->fresh();

            ActivityLog::record('firms', "updated default checklist {$checklist->name}", null, auth()->id());

            return $this->sendResponse ('RECORD_UPDATED', $checklist);
        }
    }
        

    // Get all records
    public function getAll (Request $request, string $guid='') {

        $firm_id = NULL;
        $firm = Firm::where('guid', $guid)->first();
        if ( $firm) {
            $firm_id = $firm->id;
            // return $this->sendError ("BUSINESS_NOT_FOUND");
        }

        // Global/default templates (no firm resolved) are a staff-only concept;
        // firm-scoped checklists follow the usual staff-or-own-firm rule. This is
        // a read/list action, so it uses the same read-tier org-permission code
        // as Firms::getAll() (access_business_account) rather than the manage-tier
        // manage_checklist — otherwise an accountant assigned to a firm as Senior
        // or Dataloader (neither of which is granted manage_checklist) would see
        // the firm itself but get 403 on every checklist beneath it.
        $authorized = $firm ? $this->authorizeFirmScope($firm->id, 'checklists.manage', 'access_business_account') : auth()->user()->can('checklists.manage');
        if (! $authorized) {
            return $this->sendError('UNAUTHORIZED', 403);
        }

        $filters = Config::get('clients.filters');
        $order_by = Config::get('clients.order_by');

        $rules = [
			'search' => ['nullable', 'string'],
			'results_per_page' => ['nullable', 'numeric', 'gt:0'],
			'page' => ['nullable', 'numeric'],
			'order_by' => ['nullable', 'string', Rule::in($order_by)],
            'year' => ['nullable', 'numeric', 'digits:4'],
            'month' => ['nullable', 'numeric', 'digits:2'],
		];

        $validator = Validator::make($request->all(), $rules);
        if ($validator->fails()) {
            return $this->sendError ($validator->errors());
        } else {

            // Retrieve the validated input...
            $validated          = $validator->validated();
            $results_per_page 	= $filters['results_per_page'];
            $search 			= $filters['search'];
            $page 				= $filters['page'];
            $offset 			= $filters['offset'];
            $year               = date('Y');
            $month              = date('m');

            $results_per_page = ( ! isset($validated['results_per_page'])) ? $results_per_page : $validated['results_per_page'];
            $search = ( ! isset($validated['search'])) ? $search : $validated['search'];
            $page = ( ! isset($validated['page'])) ? $page : $validated['page'];
            $order_by = ( ! isset($validated['order_by'])) ? $order_by : $validated['order_by'];
            $year = ( ! isset($validated['year'])) ? $year : $validated['year'];
            $month = ( ! isset($validated['month'])) ? $month : $validated['month'];

            // Level 1 checklist items (category = NULL)
            $sql = Checklist::where(['firm_id' => $firm_id, 'category' => NULL])
                            ->whereAny(['name', 'code', 'details', 'category'], 'like', "%$search%")
                            ->where('year', $year)
                            //->where('month', $month)
                            ->orderBy('created_at', 'DESC');

            // Pagination
            $total_results = $sql->count ();
            $max = ceil ($total_results / $results_per_page);
            for ($i=1; $i<=$max; $i++) {
                if ($i == $page) {
                    $offset = ($i-1) * $results_per_page;
                }
            }

            $records = $sql->limit($results_per_page)->offset($offset)->get();

            $num_results = count($records);
            $data = [];
            if ($num_results > 0) {
                foreach ($records as $key => $record) {
                    $files_count = 0;
                    // Level 2 checklist items (category = id of parent checklist item)
                    $children = Checklist::where('category', $record->id)->withCount('files')->with(['files'])->get();
                    // Get num records for level 2 checklist items
                    if ($children->count() == 0) {
                        $record->children = [];
                    } else {
                        $record->children = $children->toArray();
                    }
                    // Get file count for level 2 checklist item
                    $fc = $this->getFilesCount($children);
                    // Get children count for level 1 checklist item
                    $record->children_count = $children->count();
                    $record->files_count = $fc->sum('files_count');
                    $record->new_files = $fc->sum('is_new');
                    $data[] = $record;
                }
            }
            $payload = [
                'meta' => [
                    'first_page' 			=> 1,
                    'last_page' 			=> $max,
                    'current_page'			=> intval($page),
                    'num_results'			=> $num_results,
                    'total_results'			=> $total_results,
                ],
                'data' => $data,
            ];

            // An empty result set is a valid, successful response — not an
            // error — so the frontend doesn't have to special-case it to
            // avoid showing a spurious "failed to fetch" notification.
            return $this->sendResponse ('RECORDS_FOUND', $payload);

        }
    }

    // Flat list of every subcategory (level-2 checklist item) for a firm,
    // across all parent categories, each carrying its own document count —
    // for a summary/overview view that doesn't need getAll()'s nested
    // parent/children shape.
    public function subcategories (Request $request, string $guid='') {

        $firm = Firm::where('guid', $guid)->first();
        if (! $firm) {
            return $this->sendError('BUSINESS_NOT_FOUND');
        }

        // Same read-tier org-permission as getAll()/view() — see the
        // docblock there for why access_business_account (not the
        // manage-tier manage_checklist) is used for list/view actions.
        $authorized = $this->authorizeFirmScope($firm->id, 'checklists.manage', 'access_business_account');
        if (! $authorized) {
            return $this->sendError('UNAUTHORIZED', 403);
        }

        $rules = [
            'search' => ['nullable', 'string'],
            'year'   => ['nullable', 'numeric', 'digits:4'],
        ];

        $validator = Validator::make($request->all(), $rules);
        if ($validator->fails()) {
            return $this->sendError($validator->errors());
        }

        $validated = $validator->validated();
        $search    = $validated['search'] ?? '';
        $year      = $validated['year']   ?? date('Y');

        $sql = Checklist::where('firm_id', $firm->id)
            ->whereNotNull('category')
            ->where('year', $year)
            ->withCount(['files as document_count'])
            ->orderBy('name');

        if ($search !== '') {
            $sql->whereAny(['name', 'code', 'details'], 'like', "%$search%");
        }

        $subcategories = $sql->get(['id', 'name', 'code', 'category', 'details', 'is_required', 'year', 'month']);

        $data = $subcategories->map(fn ($item) => [
            'id'             => $item->id,
            'name'           => $item->name,
            'code'           => $item->code,
            'category_id'    => $item->category,
            'details'        => $item->details,
            'is_required'    => $item->is_required,
            'document_count' => $item->document_count,
        ]);

        // An empty result set is a valid, successful response — not an
        // error — so the frontend doesn't have to special-case it to
        // avoid showing a spurious "failed to fetch" notification.
        return $this->sendResponse('RECORDS_FOUND', [
            'meta' => [
                'num_results'   => $data->count(),
                'total_results' => $data->count(),
            ],
            'data' => $data,
        ]);
    }

   // Get single record
	public function view (Request $request, string $guid='', string $code='') {

        $validated = $request->validate([
            'year' => ['nullable', 'numeric', 'digits:4'],
            'month' => ['nullable', 'numeric', 'between:1,12'],
        ]);

        $firm_id = NULL;
        $firm = Firm::where('guid', $guid)->first();
        if ( $firm) {
            $firm_id = $firm->id;
        }

        // Read/view action — see getAll() above for why this is access_business_account
        // rather than manage_checklist.
        $authorized = $firm ? $this->authorizeFirmScope($firm->id, 'checklists.manage', 'access_business_account') : auth()->user()->can('checklists.manage');
        if (! $authorized) {
            return $this->sendError('UNAUTHORIZED', 403);
        }

        // Get checklist
        $count_files = 0;
        // Get level 1 checklist items with file count and files
        $checklist = Checklist::where(['code' => $code, 'firm_id'=>$firm_id])->with(['files'=> function ($query) use ($validated) {
           if(isset($validated['year']))
           {
            $query->wherePivot('year', $validated['year']);
            }
            if(isset($validated['month']))
           {
            $query->wherePivot('month', $validated['month']);
           }
        }])->first();

        if (! $checklist) {
            return $this->sendError ('CHECKLIST_NOT_FOUND');
        }

        if ($checklist->category == NULL) {
            // This is a parent checklist item, get subcategories (level 2 checklist items)
            $files_count = 0;
            // Level 2 checklist items (category = id of parent checklist item)
            $children = Checklist::where('category', $checklist->id)->with(['files'=> function ($query) use ($validated) {
                 if(isset($validated['year']))
           {
            $query->wherePivot('year', $validated['year']);
            }
            if(isset($validated['month']))
           {
            $query->wherePivot('month', $validated['month']);
           }
            }])->get();

            // Get file count for level 2 checklist item
            $fc = $this->getFilesCount($children);

            // Get num records for level 2 checklist items
            if ($children->count() == 0) {
                $checklist->children = [];
            } else {
                $checklist->children = $fc->toArray();
            }
            // Get children count for level 1 checklist item
            $checklist->children_count = $children->count();
            $checklist->files_count = $fc->sum('files_count');
            $checklist->new_files = $fc->sum('is_new');
        }

        return $this->sendResponse ('RECORDS_FOUND', $checklist);
    }


    // Delete (permanentaly)
	public function delete (Request $request, string $guid='') {

        $firm_id = NULL;
        $firm = Firm::where('guid', $guid)->first();
        if ( $firm) {
            $firm_id = $firm->id;
            // return $this->sendError ("BUSINESS_NOT_FOUND");
        }

        $authorized = $firm
            ? $this->authorizeFirmManageAction($firm->id, 'checklists.manage', 'manage_checklist')
            : auth()->user()->can('checklists.manage');
        if (! $authorized) {
            return $this->sendError('UNAUTHORIZED', 403);
        }

        // Validate the request...
        $rules = [
			'code' => ["required", "list"]
		];

        $validator = Validator::make($request->all(), $rules);

        if ($validator->fails()) {
            return $this->sendError ($validator->errors());
        } else {
            // Retrieve the validated input...
            $validated = $validator->validated();
            // Get checklist ids
            $records = Checklist::where('firm_id', $firm_id)->whereIn('code', $validated['code'])->get ();
            $checklist_ids = $records->pluck('id')->toArray();
            // Remove parent checklist items
            $deleted = Checklist::where('firm_id', $firm_id)->whereIn('code', $validated['code'])->delete ();
            // Remove child checklist items
            Checklist::where('firm_id', $firm_id)->whereIn('category', $checklist_ids)->delete ();
            if ($deleted) {
                $names = $records->pluck('name')->implode(', ');
                $description = $firm
                    ? "deleted checklist {$names} to firm {$firm->firm_name}"
                    : "deleted default checklist {$names}";
                ActivityLog::record('firms', $description, null, auth()->id());

                return $this->sendResponse ('RECORDS_DELETED');
            } else {
                return $this->sendError ('RECORDS_NOT_FOUND', 200);
            }
        }
    }

    // Import checklist
    public function import (Request $request) {

        // Validate the request...
        $rules = [
			'checklist' => ["required", "list"],
			'business' => ["required", "string", "exists:firms,guid"],
            'year' => ['nullable', 'numeric', 'digits:4'],
		];

        $validator = Validator::make($request->all(), $rules);

        if ($validator->fails()) {
            return $this->sendError ($validator->errors());
        } else {
            // Retrieve the validated input...
            $validated = $validator->validated();
            // Get business
            $firm = Firm::where('guid', $validated['business'])->first();
            if (! $firm) {
                return $this->sendError ("BUSINESS_NOT_FOUND");
            }
            if (! $this->authorizeFirmManageAction($firm->id, 'checklists.manage', 'manage_checklist')) {
                return $this->sendError('UNAUTHORIZED', 403);
            }

            $year = isset($validated['year']) ? $validated['year'] : date('Y');

            $checklist_ids = $validated['checklist'];
            if (! empty ($checklist_ids)) {
                foreach ($checklist_ids as $key => $code) {
                    $checklist = Checklist::where('code', $code)->first();
                    if ($checklist) {
                        $data = [
                            'firm_id' => $firm->id,
                            'name' => $checklist->name,
                            'year' => $year,
                            'month' => $checklist->month,
                            'is_required' => $checklist->is_required,
                            'details' => $checklist->details,
                            'category' => NULL,
                        ];
                        $new_checklist = Checklist::create($data);
                        Guid::generate ('checklist_items', 'code', $new_checklist->name, $new_checklist->id);

                        // Get subcategories
                        $subCategories = Checklist::where('category', $checklist->id)->get();
                        if ($subCategories) {
                            foreach ($subCategories as $key => $subCategory) {
                                $data = [
                                    'firm_id' => $firm->id,
                                    'name' => $subCategory->name,
                                    'year' => $year,
                                    'month' => $subCategory->month,
                                    'is_required' => $subCategory->is_required,
                                    'details' => $subCategory->details,
                                    'category' => $new_checklist->id,
                                ];
                                $new_sub_category = Checklist::create($data);
                                Guid::generate ('checklist_items', 'code', $new_sub_category->name, $new_sub_category->id);
                            }
                        }
                    }
                }
                return $this->sendResponse ('RECORDS_IMPORTED');
            }
            return $this->sendError ('NO_RECORDS_IMPORTED');
        }
    }

    // Get checklist documents
    public function documents (Request $request, string $guid='', string $code='') {

        $firm = Firm::where ('guid', $guid)->first();

        if (! $firm) {
            return $this->sendError ('BUSINESS_NOT_FOUND');
        }
        // Read/list action — see getAll() above for why this is access_business_account
        // rather than manage_checklist.
        if (! $this->authorizeFirmScope($firm->id, 'checklists.manage', 'access_business_account')) {
            return $this->sendError('UNAUTHORIZED', 403);
        }

        $checklist = Checklist::where (['code' => $code, 'firm_id' => $firm->id])->with('files')->first();

        if (! $checklist) {
            return $this->sendError ('CHECKLIST_NOT_FOUND');
        }

        $documents = $checklist->files;
        // Check if file is newly uploaded (not viewed by client yet)
        $num_isNew = 0;
        if ($documents) {
            foreach ($documents as $key => $document) {
                $is_new = app('App\Modules\Files\Controllers\Files')->isNew($document->id, auth()->id());
                $document->is_new = $is_new;
                if ($is_new) {
                    $num_isNew++;
                }
            }
        }

        $num_results = count($documents);
        if ($num_results > 0) {
            return $this->sendResponse ('RECORDS_FOUND', ['documents' => $documents, 'new_count' => $num_isNew]);
        } else {
            return $this->sendResponse ('RECORDS_NOT_FOUND', ['documents' => $documents, 'new_count' => 0], 200);
        }
    }

    // Get checklist documents
    public function getFilesCount ($children=[]) {
        $count = 0;
        $num_isNew = 0;
        $rows = $children->map(function ( $child,  $key) use ($count, $num_isNew) {
            // Get file count for level 2 checklist item
            $documents = $child->files;
            $child->files_count = $documents->count();
            //$count += $files_count;
            // Check if file is newly uploaded (not viewed by client yet)
            $is_new = 0;
            if ($documents) {
                foreach ($documents as $key => $document) {
                    $is_new = app('App\Modules\Files\Controllers\Files')->isNew($document->id, auth()->id());
                    $document->is_new = $is_new;                        
                    if ($is_new) {
                        $num_isNew++;
                    }
                }
            }
            $child->is_new = $is_new;

            return $child;
        });
/*         if (! empty ($children)) {
            $count = 0;
            foreach ($children as $key => $child) {
                // Get file count for level 2 checklist item
                $files_count = $child->files->count();
                $count += $files_count;
                // Check if file is newly uploaded (not viewed by client yet)
                $documents = $child->files;
                if ($documents) {
                    foreach ($documents as $key => $document) {
                        $is_new = app('App\Modules\Files\Controllers\Files')->isNew($document->id, auth()->id());
                        $document->is_new = $is_new;                        
                        if ($is_new) {
                            $num_isNew++;
                        }
                    }
                }
                $child->is_new = $is_new;
            }
        }
 */        
        //return ['files_count' => $count, 'new_files' => $num_isNew];
        return $rows;

    }

  public function getFilteredFilesCount($children = [])
{
    $num_isNew = 0;

    // STEP 1: collect all file IDs
    $documentIds = $children->flatMap->files->pluck('id');

    // STEP 2: get viewed files
    $viewedFileIds = DB::table('file_views')
        ->whereIn('file_id', $documentIds)
        ->where('user_id', auth()->id())
        ->pluck('file_id')
        ->toArray();

    $rows = $children->map(function ($child) use (&$num_isNew, $viewedFileIds) {

        $documents = $child->files;
        $child->files_count = $documents->count();

        $is_new = 0;

        foreach ($documents as $document) {

            // ✅ FAST check (no DB query here)
            $docIsNew = !in_array($document->id, $viewedFileIds);

            $document->is_new = $docIsNew;

            if ($docIsNew) {
                $num_isNew++;
                $is_new = 1;
            }
        }

        $child->is_new = $is_new;

        return $child;
    });

    return $rows;
}

}
