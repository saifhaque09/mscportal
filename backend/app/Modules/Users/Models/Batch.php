<?php

namespace App\Modules\Users\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsToMany;
use Illuminate\Database\Eloquent\Relations\HasManyThrough;

use App\Modules\Tests\Models\Submission;
use App\Modules\Tests\Models\Attempt;
use App\Models\User;

class Batch extends Model
{

    /**
     * The table associated with the model.
     *
     * @var string
     */
    protected $table = 'batches';

    /**
     * Specify the attributes that can be mass-assigned
     *
     * @var string
     */
    protected $fillable = [ 'guid', 'title', 'batch_id', 'details', 'start_date', 'end_date', 'status', 'max_enrollment' ];

    /**
     * Indicates if the model should be timestamped.
     *
     * @var bool
     */
    public $timestamps = true;


    /**
     * Get the tests that owns the Attempt
     *
     * @return \Illuminate\Database\Eloquent\Relations\BelongsTo
     */
    public function users(): BelongsToMany
    {
        return $this->belongsToMany(User::class, 'user_batches', 'batch_id', 'user_id');
    }

    /**
     * Get the submissions that owns the Attempt
     *
     * @return \Illuminate\Database\Eloquent\Relations\BelongsTo
     */
    public function submissions(): HasManyThrough
    {
        return $this->hasManyThrough(Submission::class, Attempt::class, 'user_id', 'attempt_id', 'id', 'id');
    }

}
