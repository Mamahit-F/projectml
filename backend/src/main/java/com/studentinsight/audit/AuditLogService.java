package com.studentinsight.audit;

import com.studentinsight.user.User;
import com.studentinsight.user.UserRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.security.core.Authentication;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Propagation;
import org.springframework.transaction.annotation.Transactional;

@Service
@RequiredArgsConstructor
public class AuditLogService {

    private final AuditLogRepository auditLogRepository;
    private final UserRepository userRepository;

    @Transactional(propagation = Propagation.REQUIRES_NEW)
    public void log(String action, String entityName, Long entityId, String oldVal, String newVal, String details) {
        User currentUser = null;
        try {
            Authentication auth = SecurityContextHolder.getContext().getAuthentication();
            if (auth != null && auth.isAuthenticated() && !auth.getPrincipal().equals("anonymousUser")) {
                currentUser = userRepository.findByUsername(auth.getName()).orElse(null);
            }
        } catch (Exception ignored) {
        }

        AuditLog log = AuditLog.builder()
                .user(currentUser)
                .action(action)
                .entityName(entityName)
                .entityId(entityId)
                .oldValues(oldVal)
                .newValues(newVal)
                .details(details)
                .build();

        auditLogRepository.save(log);
    }
}
