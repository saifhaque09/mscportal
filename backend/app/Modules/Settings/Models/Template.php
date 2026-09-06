<?php

namespace App\Modules\Settings\Models;

use Illuminate\Database\Eloquent\Model;


class Template extends Model
{

    /**
     * The table associated with the model.
     *
     * @var string
     */
    protected $table = 'email_templates';

    /**
     * Specify the attributes that can be mass-assigned
     *
     * @var string
     */
    protected $fillable = [ 'name', 'subject', 'body'];

    /**
     * Indicates if the model should be timestamped.
     *
     * @var bool
     */
    public $timestamps = true;

}
