<?php

namespace App\Modules\Clients\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsToMany;
use Illuminate\Database\Eloquent\Relations\HasManyThrough;

use Illuminate\Database\Eloquent\Relations\BelongsTo;
use App\Modules\Clients\Models\Firm;
use App\Models\User;

class Invite extends Model
{

    /**
     * The table associated with the model.
     *
     * @var string
     */
    protected $table = 'invites';

    /**
     * Specify the attributes that can be mass-assigned
     *
     * @var string
     */
    protected $fillable = [ 'firm_id', 'created_by', 'email', 'mobile', 'name', 'role', 'hash', 'meta' ];

    /**
     * Indicates if the model should be timestamped.
     *
     * @var bool
     */
    public $timestamps = true;

    /**
     * meta holds SIN, DOB, marital/spouse details, and banking info collected
     * at invite time — encrypted at rest, same as the eventual users.meta column.
     *
     * @var array
     */
    protected $casts = [
        'meta' => 'encrypted:array',
    ];


    /**
     * Get the business that owns the Invite
     *
     * @return \Illuminate\Database\Eloquent\Relations\BelongsTo
     */
    public function business(): BelongsTo
    {
        return $this->belongsTo(Firm::class, 'firm_id', 'id');
    }
}
