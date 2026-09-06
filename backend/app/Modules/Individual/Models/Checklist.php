<?php

namespace App\Modules\Individual\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\BelongsToMany;
use Illuminate\Database\Eloquent\Relations\HasManyThrough;
use App\Modules\Firms\Models\Firm;

use App\Modules\Files\Models\File;
use App\Modules\Individual\Models\Document;

class Checklist extends Model
{

    /**
     * The table associated with the model.
     *
     * @var string
     */
    protected $table = 'checklist_items';

    /**
     * Specify the attributes that can be mass-assigned
     *
     * @var string
     */
    protected $fillable = [ 'guid', 'name', 'code', 'category', 'year', 'month', 'details', 'is_required', 'created_by', 'updated_by', 'firm_id'];

    /**
     * Indicates if the model should be timestamped.
     *
     * @var bool
     */
    public $timestamps = true;

    /**
     * Get the firm that owns the Checklist
     *
     * @return \Illuminate\Database\Eloquent\Relations\BelongsTo
     */
    public function firm(): BelongsTo
    {
        return $this->belongsTo(Firm::class, 'firm_id', 'id');
    }

    
    /**
     * The files that belong to the Checklist
     *
     * @return \Illuminate\Database\Eloquent\Relations\BelongsToMany
     */
    public function files(): BelongsToMany
    {
        return $this->belongsToMany(File::class, 'documents', 'checklist_id', 'file_id')->withPivot('status', 'comments', 'uploaded_by', 'year', 'month')->withTimestamps();
    }
    

}
