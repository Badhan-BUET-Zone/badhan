# Bubblewrap requires JDK 17 specifically; this is the JDK, and Node comes on top.
FROM eclipse-temurin:17-jdk-jammy

ENV ANDROID_HOME=/opt/android-sdk \
    HOME=/home/deploy \
    GRADLE_USER_HOME=/home/deploy/.gradle
ENV PATH=$PATH:$ANDROID_HOME/cmdline-tools/latest/bin:$ANDROID_HOME/platform-tools

RUN apt-get update && apt-get install -y --no-install-recommends \
      curl unzip git ca-certificates ruby-full build-essential \
    && rm -rf /var/lib/apt/lists/*

# Node 22 for @bubblewrap/cli, from nodesource — the temurin base has no node.
RUN curl -fsSL https://deb.nodesource.com/setup_22.x | bash - \
    && apt-get install -y --no-install-recommends nodejs \
    && rm -rf /var/lib/apt/lists/*

# Android SDK. ANDROID_API tracks app/build.gradle's compileSdkVersion /
# targetSdkVersion; AGP_VERSION tracks the com.android.tools.build:gradle
# classpath in build.gradle. Both are re-exported as ENV below so
# upload-googleplay.js can compare them against the gradle files and fail
# loudly on drift instead of letting gradle produce a confusing error.
#
# Two build-tools are installed on purpose: BUILD_TOOLS matches the compile SDK,
# and AGP_BUILD_TOOLS is the default AGP 8.9.x picks when build.gradle names no
# buildToolsVersion (it does not). Without the second one, gradle tries to
# download it mid-build.
ARG ANDROID_API=36
ARG BUILD_TOOLS=36.0.0
ARG AGP_BUILD_TOOLS=35.0.0
ARG AGP_VERSION=8.9.1
RUN mkdir -p $ANDROID_HOME/cmdline-tools \
    && curl -fsSL -o /tmp/cmdline-tools.zip \
       https://dl.google.com/android/repository/commandlinetools-linux-11076708_latest.zip \
    && unzip -q /tmp/cmdline-tools.zip -d $ANDROID_HOME/cmdline-tools \
    && mv $ANDROID_HOME/cmdline-tools/cmdline-tools $ANDROID_HOME/cmdline-tools/latest \
    && rm /tmp/cmdline-tools.zip \
    && yes | sdkmanager --licenses > /dev/null \
    && sdkmanager "platform-tools" "platforms;android-${ANDROID_API}" \
                  "build-tools;${BUILD_TOOLS}" "build-tools;${AGP_BUILD_TOOLS}"

# What the image actually installed, readable from outside via `printenv`.
ENV ANDROID_API=${ANDROID_API} \
    BUILD_TOOLS=${BUILD_TOOLS} \
    AGP_VERSION=${AGP_VERSION}

# Pinned to the host versions in use when the Play build moved into a container,
# for the same reason as FIREBASE_TOOLS_VERSION: the first containerized run
# must not also be an upgrade.
ARG BUBBLEWRAP_VERSION=1.24.1
ARG FASTLANE_VERSION=2.237.0
RUN npm install -g @bubblewrap/cli@${BUBBLEWRAP_VERSION} \
    && gem install fastlane -N -v ${FASTLANE_VERSION}

# Bubblewrap reads os.homedir()/.bubblewrap/config.json and otherwise drops into
# an interactive wizard that offers to download a JDK — which hangs a non-
# interactive run. Baking it is what lets upload-googleplay.js drop its host
# `bubblewrap doctor` checks entirely.
#
# GRADLE_USER_HOME must exist BEFORE the chmod: docker seeds the android-gradle
# named volume from the image's directory at that path, so an absent or
# root-only-writable one produces a root-owned volume the Linux `user:` uid
# cannot write to.
RUN mkdir -p /home/deploy/.bubblewrap "$GRADLE_USER_HOME" \
    && printf '{"jdkPath":"%s","androidSdkPath":"%s"}' "$JAVA_HOME" "$ANDROID_HOME" \
       > /home/deploy/.bubblewrap/config.json \
    && chmod -R 0777 /home/deploy

# fastlane refuses to run under a non-UTF-8 locale ("Your language is set to
# ...") and the base image sets none. Kept last so it costs no rebuild of the
# SDK layers above.
ENV LANG=C.UTF-8 \
    LC_ALL=C.UTF-8

WORKDIR /repo
