<?php

namespace App\Modules\Organizations\Models;

use Illuminate\Database\Eloquent\Model;

class OrganizationRole extends Model
{
    protected $table = 'organization_roles';

    protected $fillable = ['name', 'code', 'status'];

    protected function casts(): array
    {
        return [
            'status' => 'string',
        ];
    }

    public $timestamps = true;

    public function permissions()
    {
        return $this->belongsToMany(
            OrganizationPermission::class,
            'organization_role_permissions',
            'organization_role_id',
            'permission_id'
        )->withTimestamps();
    }
}
