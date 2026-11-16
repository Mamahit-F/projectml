package com.studentinsight.user.dto;

import com.studentinsight.user.Role;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class LoginResponse {
    private String token;
    @Builder.Default
    private String tokenType = "Bearer";
    private Long id;
    private String username;
    private String email;
    private String fullName;
    private Role role;
}
