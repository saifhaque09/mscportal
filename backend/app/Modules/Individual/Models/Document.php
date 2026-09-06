<?php

namespace App\Modules\Individual\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsToMany;
use Illuminate\Database\Eloquent\Relations\HasManyThrough;
use Illuminate\Database\Eloquent\SoftDeletes;


use App\Models\User;

class Document extends Model
{
    use SoftDeletes;

    /**
     * The table associated with the model.
     *
     * @var string
     */
    protected $table = 'documents';

    /**
     * Specify the attributes that can be mass-assigned
     *
     * @var string
     */
    protected $fillable = [ 'checklist_id', 'file_id', 'status', 'comment', 'year', 'month', 'uploaded_by' ];

    /**
     * Indicates if the model should be timestamped.
     *
     * @var bool
     */
    public $timestamps = true;



}
