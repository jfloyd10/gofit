from django.contrib.auth import get_user_model
from rest_framework import serializers

from accounts.models import UserProfile

User = get_user_model()


class UserProfileSerializer(serializers.ModelSerializer):
    class Meta:
        model = UserProfile
        fields = [
            "display_name",
            "bio",
            "avatar",
            "date_of_birth",
            "height_cm",
            "weight_kg",
            "units",
            "is_verified"
        ]


class UserSerializer(serializers.ModelSerializer):
    # Expose as "profile" in the API, but map to the related_name "user_profile"
    profile = UserProfileSerializer(source="user_profile")

    class Meta:
        model = User
        fields = ["id", "username", "email", "first_name", "last_name", "profile"]
        read_only_fields = ["id", "username", "email"]

    def update(self, instance, validated_data):
        profile_data = validated_data.pop("profile", {})
        instance = super().update(instance, validated_data)
        profile = instance.user_profile
        for attr, value in profile_data.items():
            setattr(profile, attr, value)
        profile.save()
        return instance


class PublicUserSerializer(serializers.ModelSerializer):
    """
    Read-only serializer for viewing other users' profiles.
    """
    profile = UserProfileSerializer(source="user_profile", read_only=True)
    followers_count = serializers.IntegerField(source="followers.count", read_only=True)
    following_count = serializers.IntegerField(source="following.count", read_only=True)
    programs_count = serializers.IntegerField(source="programs.count", read_only=True)

    class Meta:
        model = User
        fields = [
            "id", 
            "username", 
            "first_name", 
            "last_name", 
            "profile", 
            "followers_count", 
            "following_count",
            "programs_count"
        ]


class RegisterSerializer(serializers.ModelSerializer):
    password = serializers.CharField(write_only=True)
    password_confirm = serializers.CharField(write_only=True)
    display_name = serializers.CharField(write_only=True, required=False, allow_blank=True)

    class Meta:
        model = User
        fields = ["username", "email", "password", "password_confirm", "display_name"]

    def validate(self, attrs):
        if attrs["password"] != attrs["password_confirm"]:
            raise serializers.ValidationError("Passwords do not match.")
        return attrs

    def create(self, validated_data):
        password = validated_data.pop("password")
        validated_data.pop("password_confirm", None)
        display_name = validated_data.pop("display_name", "")

        user = User.objects.create_user(**validated_data)
        if display_name:
            user.user_profile.display_name = display_name
            user.user_profile.save()

        return user