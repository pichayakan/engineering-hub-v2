# backend/api/signals.py
from django.db.models.signals import (
    post_save,
    pre_save,
    m2m_changed,
)  # 1. Import m2m_changed
from django.dispatch import receiver
from .models import Task, Activity, Comment, TaskAttachment
from accounts.models import User

# ใช้ตัวแปร global ชั่วคราวเพื่อเก็บสถานะเก่าของ task
# (นี่เป็นเทคนิคง่ายๆ สำหรับกรณีนี้)
_task_old_instance = {}


@receiver(pre_save, sender=Task)
def store_old_task_instance(sender, instance, **kwargs):
    """
    ก่อนที่ Task จะถูก save, ให้เก็บ instance เก่าไว้ก่อนเพื่อเปรียบเทียบ
    """
    if instance.pk:
        _task_old_instance[instance.pk] = Task.objects.get(pk=instance.pk)


@receiver(post_save, sender=Task)
def create_task_activity(sender, instance, created, **kwargs):
    """
    หลังจากที่ Task ถูก save, ให้สร้าง Activity log
    """
    # ดึง actor จาก request ที่ถูกส่งมา (ต้องใช้เทคนิคเพิ่มเติมใน ViewSet)
    # ในที่นี้เราจะใช้คนที่แก้ไขล่าสุดเป็น actor ไปก่อน
    actor = getattr(instance, "_last_modified_by", None)
    if not actor:
        # ถ้าไม่มี ให้ใช้เจ้าของโปรเจกต์ หรือคนแรกที่ถูกมอบหมายงาน
        actor = instance.project.owner or (
            instance.assignees.first() if instance.assignees.exists() else None
        )

    if not actor:
        return  # ถ้ายังหา actor ไม่ได้ ก็ไม่ต้องสร้าง log

    if created:
        # กรณีสร้าง Task ใหม่
        verb = f"created the task '{instance.title}'"
        Activity.objects.create(task=instance, actor=actor, verb=verb)
    else:
        # กรณีอัปเดต Task เก่า
        old_instance = _task_old_instance.get(instance.pk)
        if old_instance:
            # เปรียบเทียบ status
            if old_instance.status != instance.status:
                verb = f"changed the status from '{old_instance.status}' to '{instance.status}'"
                Activity.objects.create(task=instance, actor=actor, verb=verb)

            # คุณสามารถเพิ่มการเปรียบเทียบฟิลด์อื่นๆ ได้ที่นี่ เช่น title, assignees
            # ...


@receiver(post_save, sender=Comment)
def create_comment_activity(sender, instance, created, **kwargs):
    """
    สร้าง Activity log เมื่อมีการเพิ่ม comment ใหม่
    """
    if created:
        verb = f'commented: "{instance.text[:50]}..."'
        Activity.objects.create(
            task=instance.task, actor=instance.author, verb=verb)


@receiver(post_save, sender=TaskAttachment)
def create_attachment_activity(sender, instance, created, **kwargs):
    """
    สร้าง Activity log เมื่อมีการแนบไฟล์ใหม่
    """
    if created:
        file_name = instance.file.name.split("/")[-1]
        verb = f"attached the file: {file_name}"
        Activity.objects.create(
            task=instance.task, actor=instance.uploaded_by, verb=verb
        )


@receiver(m2m_changed, sender=Task.accepted_by.through)
def log_acceptance_activity(sender, instance, action, pk_set, **kwargs):
    """
    สร้าง Activity log เมื่อมีการเปลี่ยนแปลงใน `accepted_by` field ของ Task
    """
    # pk_set คือ set ของ ID ผู้ใช้ที่ถูกเพิ่มหรือลบ
    if not pk_set:
        return

    # ดึง User object คนแรกที่ถูกกระทำ (ในระบบของเราจะมีแค่คนเดียว)
    user_id = list(pk_set)[0]
    actor = User.objects.get(pk=user_id)

    if action == "post_add":
        # เกิดขึ้นหลังจากที่ user ถูกเพิ่มเข้าไปใน accepted_by
        verb = "accepted the task"
        Activity.objects.create(task=instance, actor=actor, verb=verb)

    elif action == "post_remove":
        # เกิดขึ้นหลังจากที่ user ถูกนำออกจาก accepted_by
        verb = "revoked their acceptance of the task"
        Activity.objects.create(task=instance, actor=actor, verb=verb)
