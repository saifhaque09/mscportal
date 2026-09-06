<?php

namespace App\Modules\Organizations\Models;

use Illuminate\Database\Eloquent\Model;

class OrganizationRolePermission extends Model
{
    protected $table = 'organization_role_permissions';

    protected $fillable = ['organization_role_id', 'permission_id'];

    public $timestamps = true;

    public function role()
    {
        return $this->belongsTo(OrganizationRole::class, 'organization_role_id');
    }

    public function permission()
    {
        return $this->belongsTo(OrganizationPermission::class, 'permission_id');
    }
}
