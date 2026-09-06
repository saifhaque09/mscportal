<?php

namespace App\Modules\Organizations\Models;

use Illuminate\Database\Eloquent\Model;

class OrganizationPermission extends Model
{
    protected $table = 'organization_permissions';

    protected $fillable = ['name', 'code', 'status'];

    public $timestamps = true;
}
