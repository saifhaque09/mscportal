<?php
namespace App\Modules\Users\Models;
use Spatie\Permission\Models\Role as SpatieRole;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\HasMany;
use App\Models\User;
use App\Modules\Users\Models\ACL;

class Role extends SpatieRole
{

    /**
     * The acl that belong to the Role
     *
     * @return \Illuminate\Database\Eloquent\Relations\HasMany
     */
    public function links(): HasMany
    {
        return $this->hasMany(ACL::class, 'role_id', 'id')->where('status', 1);
    }

}
