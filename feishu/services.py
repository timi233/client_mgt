import logging
from django.utils import timezone

from accounts.models import User, Account
from feishu.client import feishu_client


logger = logging.getLogger(__name__)


class FeishuUserSyncService:
    def sync_user_from_feishu(self, user_data, account=None):
        try:
            open_id = user_data.get("open_id")
            user_id = user_data.get("user_id")
            union_id = user_data.get("union_id")

            if not open_id and not user_id:
                logger.warning("No valid identifier in user_data")
                return None

            department_ids = user_data.get("department_ids", [])
            department_id = department_ids[0] if department_ids else None

            username = user_data.get("email")
            if not username:
                username = user_id or open_id
            username = username[:150]

            defaults = {
                "feishu_open_id": open_id,
                "feishu_union_id": union_id,
                "feishu_user_id": user_id,
                "display_name": user_data.get("name") or user_data.get("display_name"),
                "avatar_url": user_data.get("avatar") or user_data.get("avatar_url"),
                "mobile": user_data.get("mobile"),
                "department_id": department_id,
                "job_title": user_data.get("job_title"),
                "feishu_team_id": department_id,
                "is_active": user_data.get("is_active", True),
                "last_sync_at": timezone.now(),
            }

            if username and "@" in username:
                defaults["email"] = username

            if account:
                defaults["account"] = account

            user, created = User.objects.update_or_create(
                feishu_user_id=user_id, defaults=defaults
            )

            if created:
                logger.info(f"Created user {username} from Feishu")
            else:
                logger.info(f"Updated user {username} from Feishu")

            return user

        except Exception as e:
            logger.error(f"Error syncing user from Feishu: {e}")
            return None

    def sync_all_users(self, account=None):
        try:
            page_token = None
            sync_count = 0

            while True:
                data = feishu_client.get_user_list(
                    department_id=None, page_token=page_token
                )

                if not data or data.get("code") != 0:
                    logger.error(
                        f"Error fetching user list: {data.get('msg') if data else 'No data'}"
                    )
                    break

                user_list = data.get("data", {}).get("items", [])

                if not user_list:
                    break

                for user_data in user_list:
                    user = self.sync_user_from_feishu(user_data, account=account)
                    if user:
                        sync_count += 1

                page_token = data.get("data", {}).get("page_token")

                if not page_token:
                    break

            logger.info(f"Synced {sync_count} users from Feishu")
            return sync_count

        except Exception as e:
            logger.error(f"Error syncing all users from Feishu: {e}")
            return 0

    def sync_department_structure(self, account=None):
        try:
            department_map = {}
            page_token = None

            while True:
                data = feishu_client.get_department_list(
                    parent_department_id="0", page_token=page_token, page_size=50
                )

                if not data or data.get("code") != 0:
                    logger.error(
                        f"Error fetching department list: {data.get('msg') if data else 'No data'}"
                    )
                    break

                departments = data.get("data", {}).get("items", [])

                if not departments:
                    break

                for dept_data in departments:
                    dept_id = dept_data.get("department_id")
                    dept_name = dept_data.get("name")
                    department_map[dept_id] = dept_name

                page_token = data.get("data", {}).get("page_token")
                has_more = data.get("data", {}).get("has_more", False)

                if not has_more:
                    break

            logger.info(f"Fetched {len(department_map)} departments from Feishu")

            if account and account.pk:
                account.settings["feishu_departments"] = department_map
                account.save(update_fields=["settings"])
                logger.info(f"Updated account {account.name} with department structure")

            return department_map

        except Exception as e:
            logger.error(f"Error syncing department structure from Feishu: {e}")
            return {}
