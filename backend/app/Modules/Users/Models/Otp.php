<?php

namespace App\Modules\Users\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsToMany;
use Illuminate\Database\Eloquent\Relations\HasManyThrough;

use App\Models\User;

class Otp extends Model
{

    /**
     * The table associated with the model.
     *
     * @var string
     */
    protected $table = 'otps'; 

    /**
     * Specify the attributes that can be mass-assigned
     *
     * @var string
     */
    protected $fillable = [ 'email', 'otp', 'hash', 'valid_till', 'type'];

    /**
     * Indicates if the model should be timestamped.
     *
     * @var bool
     */
    public $timestamps = true;

}
