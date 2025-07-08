# backend/api/permissions.py
from rest_framework import permissions
from accounts.models import User, Department


def get_all_subordinate_departments(department):
    """
    ฟังก์ชันสำหรับหา Department ลูกทั้งหมดที่อยู่ภายใต้ Department ที่กำหนด
    """
    subordinates = {department}
    children = department.children.all()
    for child in children:
        subordinates.update(get_all_subordinate_departments(child))
    return subordinates


def user_can_assign_to(assigner: User, assignee: User) -> bool:
    """
    ตรวจสอบว่า 'assigner' มีสิทธิ์มอบหมายงานให้ 'assignee' หรือไม่
    """
    if assigner.is_superadmin:
        return True
    if not assignee.department:
        return False

    managed_departments = assigner.managed_departments.all()
    if not managed_departments:
        return False

    authorized_department_ids = set()
    for dept in managed_departments:
        for sub_dept in get_all_subordinate_departments(dept):
            authorized_department_ids.add(sub_dept.id)

    return assignee.department.id in authorized_department_ids
