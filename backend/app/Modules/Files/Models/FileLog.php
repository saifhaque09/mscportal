<?php

namespace App\Modules\Files\Models;

use Illuminate\Database\Eloquent\Casts\Attribute;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Support\Facades\Storage;
use App\Modules\Checklists\Models\Checklist;
use App\Modules\Files\Models\Document;
use Illuminate\Database\Eloquent\Relations\HasOne;
use Illuminate\Database\Eloquent\Relations\BelongsToMany;

class FileLog extends Model
{

    /**
     * The table associated with the model.
     *
     * @var string
     */
    protected $table = 'files_log';

    /**
     * Specify the attributes that can be mass-assigned
     *
     * @var string
     */
    protected $fillable = [ 'file_id', 'user_id', 'last_accessed_on'];

    public $timestamps = false;

}
