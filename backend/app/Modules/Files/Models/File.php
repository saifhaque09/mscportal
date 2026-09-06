<?php

namespace App\Modules\Files\Models;

use Illuminate\Database\Eloquent\Casts\Attribute;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Support\Facades\URL;
use Illuminate\Database\Eloquent\Relations\HasOne;
use Illuminate\Database\Eloquent\Relations\HasMany;
use Illuminate\Database\Eloquent\Relations\BelongsToMany;

use App\Modules\Files\Models\FileLog;
use App\Modules\Clients\Models\Checklist;

class File extends Model
{

    /**
     * The table associated with the model.
     *
     * @var string
     */
    protected $table = 'files';

    /**
     * Specify the attributes that can be mass-assigned
     *
     * @var string
     */
    protected $fillable = [ 'group', 'file_name', 'file_hash', 'file_size', 'file_path', 'file_type', 'created_by', 'updated_by'];

    /**
     * Indicates if the model should be timestamped.
     *
     * @var bool
     */
    public $timestamps = true;

    /**
     * Add base url to file paths.
     */
    protected function filePath(): Attribute
    {
        return Attribute::make(
            get: fn ($value) => $value
                ? URL::temporarySignedRoute(
                    'files.stream',
                    now()->addMinutes(10),
                    ['file_id' => $this->id, 'uid' => auth()->id()]
                )
                : null,
        );
    }


    /**
     * Sets default auth user guid to all new created records
     *
     * @var string
     */
    protected static function booted(): void
    {

        static::saving(function ($model) {
            $id = auth()->user()->id;
            if ($model->exists) {
                $model->updated_by = $id;
            } else {
                $model->created_by = $id;
                $model->updated_by = $id;
            }
        });

    }

    /**
     * The checklist that belong to the File
     *
     * @return \Illuminate\Database\Eloquent\Relations\BelongsToMany
     */
    public function checklist(): BelongsToMany
    {
        return $this->belongsToMany(Checklist::class, 'documents', 'file_id', 'checklist_id');
    }

    /**
     * Get the document associated with the File
     *
     * @return \Illuminate\Database\Eloquent\Relations\HasOne
     */
    public function document(): HasOne
    {
        return $this->hasOne(Document::class, 'file_id', 'id');
    }
    
    /**
     * Get the file log for the File
     *
     * @return \Illuminate\Database\Eloquent\Relations\HasMany
     */
    public function fileLog(): HasMany
    {
        return $this->hasMany(FileLog::class, 'file_id', 'id');
    }

    public function taxDocuments()
{
    return $this->hasMany(TaxFilerDocument::class, 'file_id');
}
}
